using Microsoft.AspNetCore.Http;
using Xabe.FFmpeg;

namespace Keepshot.Api.Services
{
    public class VideoProcessingService : IVideoProcessingService
    {
        public async Task<string> ExtractFrameAsync(IFormFile file, string time, HttpRequest request)
        {
            // Base folders
            var root = Directory.GetCurrentDirectory();
            var tempFolder = Path.Combine(root, "temp");
            var screenshotsFolder = Path.Combine(root, "wwwroot", "screenshots");

            Directory.CreateDirectory(tempFolder);
            Directory.CreateDirectory(screenshotsFolder);

            // 1) Save video temporarily
            var inputPath = Path.Combine(
                tempFolder,
                $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}"
            );

            using (var stream = new FileStream(inputPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // 2) Parse time
            var timestamp = ParseTimestamp(time);

            // 3) Get duration and clamp
            var mediaInfo = await FFmpeg.GetMediaInfo(inputPath);
            var maxDuration = mediaInfo.Duration;

            if (timestamp > maxDuration)
            {
                var safe = maxDuration - TimeSpan.FromSeconds(1);
                if (safe < TimeSpan.Zero)
                    safe = TimeSpan.Zero;

                timestamp = safe;
            }

            // 4) Output path
            var outputFileName = $"keepshot_{Guid.NewGuid():N}.jpg";
            var outputPath = Path.Combine(screenshotsFolder, outputFileName);

            // 5) Snapshot
            var conversion = await FFmpeg.Conversions.FromSnippet
                .Snapshot(inputPath, outputPath, timestamp);

            conversion.SetOverwriteOutput(true);

            await conversion.Start();

            // 6) Cleanup temp video
            try { File.Delete(inputPath); } catch { /* ignore */ }

            // 7) Public URL
            var baseUrl = $"{request.Scheme}://{request.Host}";
            var imageUrl = $"{baseUrl}/screenshots/{outputFileName}";

            return imageUrl;
        }

        // 👇 NEW: multi-screenshot version, more efficient
        public async Task<List<string>> ExtractFramesAsync(
            IFormFile file,
            IEnumerable<string> times,
            HttpRequest request)
        {
            var root = Directory.GetCurrentDirectory();
            var tempFolder = Path.Combine(root, "temp");
            var screenshotsFolder = Path.Combine(root, "wwwroot", "screenshots");

            Directory.CreateDirectory(tempFolder);
            Directory.CreateDirectory(screenshotsFolder);

            // 1) Save the video ONCE
            var inputPath = Path.Combine(
                tempFolder,
                $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}"
            );

            using (var stream = new FileStream(inputPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // 2) Get media info ONCE
            var mediaInfo = await FFmpeg.GetMediaInfo(inputPath);
            var maxDuration = mediaInfo.Duration;

            var imageUrls = new List<string>();
            var index = 0;

            foreach (var rawTime in times)
            {
                if (string.IsNullOrWhiteSpace(rawTime))
                    continue;

                var timestamp = ParseTimestamp(rawTime);

                if (timestamp > maxDuration)
                {
                    var safe = maxDuration - TimeSpan.FromSeconds(1);
                    if (safe < TimeSpan.Zero)
                        safe = TimeSpan.Zero;

                    timestamp = safe;
                }

                var outputFileName = $"keepshot_{Guid.NewGuid():N}_{index}.jpg";
                var outputPath = Path.Combine(screenshotsFolder, outputFileName);

                var conversion = await FFmpeg.Conversions.FromSnippet
                    .Snapshot(inputPath, outputPath, timestamp);

                conversion.SetOverwriteOutput(true);
                await conversion.Start();

                var baseUrl = $"{request.Scheme}://{request.Host}";
                var imageUrl = $"{baseUrl}/screenshots/{outputFileName}";
                imageUrls.Add(imageUrl);

                index++;
            }

            // 3) Cleanup temp video
            try { File.Delete(inputPath); } catch { /* ignore */ }

            return imageUrls;
        }

        // already existed in your file
        private static TimeSpan ParseTimestamp(string time)
        {
            if (string.IsNullOrWhiteSpace(time))
                throw new ArgumentException("Time is required", nameof(time));

            var parts = time.Trim().Split(':', StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length == 1)
            {
                // "ss"
                if (!int.TryParse(parts[0], out var seconds))
                    throw new ArgumentException($"Invalid time format: {time}");

                return TimeSpan.FromSeconds(seconds);
            }

            if (parts.Length == 2)
            {
                // "mm:ss"
                if (!int.TryParse(parts[0], out var minutes) ||
                    !int.TryParse(parts[1], out var seconds))
                    throw new ArgumentException($"Invalid time format: {time}");

                return new TimeSpan(0, minutes, seconds);
            }

            if (parts.Length == 3)
            {
                // "hh:mm:ss"
                if (!int.TryParse(parts[0], out var hours) ||
                    !int.TryParse(parts[1], out var minutes) ||
                    !int.TryParse(parts[2], out var seconds))
                    throw new ArgumentException($"Invalid time format: {time}");

                return new TimeSpan(hours, minutes, seconds);
            }

            throw new ArgumentException($"Invalid time format: {time}");
        }
    }
}
