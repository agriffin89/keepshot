using Microsoft.AspNetCore.Http;
using Xabe.FFmpeg;

namespace Keepshot.Api.Services
{
    public class VideoProcessingService : IVideoProcessingService
    {
        public async Task<string> ExtractFrameAsync(IFormFile file, string time, HttpRequest request)
        {
            var root = Directory.GetCurrentDirectory();
            var tempFolder = Path.Combine(root, "temp");
            var screenshotsFolder = Path.Combine(root, "wwwroot", "screenshots");

            Directory.CreateDirectory(tempFolder);
            Directory.CreateDirectory(screenshotsFolder);

            // 1) Save temp video
            var inputPath = Path.Combine(
                tempFolder,
                $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}"
            );

            using (var stream = new FileStream(inputPath, FileMode.Create))
                await file.CopyToAsync(stream);

            // 2) Parse timestamp
            var timestamp = ParseTimestamp(time);

            // 3) Media duration & clamp
            var mediaInfo = await FFmpeg.GetMediaInfo(inputPath);
            var maxDuration = mediaInfo.Duration;

            if (timestamp > maxDuration)
            {
                timestamp = maxDuration - TimeSpan.FromSeconds(1);
                if (timestamp < TimeSpan.Zero)
                    timestamp = TimeSpan.Zero;
            }

            // 4) Output screenshot path
            var outputFileName = $"keepshot_{Guid.NewGuid():N}.jpg";
            var outputPath = Path.Combine(screenshotsFolder, outputFileName);

            // 5) Snapshot
            var conversion = await FFmpeg.Conversions.FromSnippet
                .Snapshot(inputPath, outputPath, timestamp);

            conversion.SetOverwriteOutput(true);
            await conversion.Start();

            // 6) Cleanup temp video
            try { File.Delete(inputPath); } catch { }

            // 🔥 AUTO-CLEAN older files
            CleanOldFiles(tempFolder, TimeSpan.FromHours(1));
            CleanOldFiles(screenshotsFolder, TimeSpan.FromHours(1));

            // 7) Build public URL
            var baseUrl = $"{request.Scheme}://{request.Host}";
            return $"{baseUrl}/screenshots/{outputFileName}";
        }

        // ================================
        // MULTI-SCREENSHOT VERSION
        // ================================
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

            // Save video once
            var inputPath = Path.Combine(
                tempFolder,
                $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}"
            );

            using (var stream = new FileStream(inputPath, FileMode.Create))
                await file.CopyToAsync(stream);

            // Get duration once
            var mediaInfo = await FFmpeg.GetMediaInfo(inputPath);
            var maxDuration = mediaInfo.Duration;

            var resultUrls = new List<string>();
            var index = 0;

            foreach (var raw in times)
            {
                if (string.IsNullOrWhiteSpace(raw)) continue;

                var timestamp = ParseTimestamp(raw);

                if (timestamp > maxDuration)
                {
                    timestamp = maxDuration - TimeSpan.FromSeconds(1);
                    if (timestamp < TimeSpan.Zero) timestamp = TimeSpan.Zero;
                }

                var outputFileName = $"keepshot_{Guid.NewGuid():N}_{index}.jpg";
                var outputPath = Path.Combine(screenshotsFolder, outputFileName);

                var conversion = await FFmpeg.Conversions.FromSnippet
                    .Snapshot(inputPath, outputPath, timestamp);

                conversion.SetOverwriteOutput(true);
                await conversion.Start();

                var baseUrl = $"{request.Scheme}://{request.Host}";
                resultUrls.Add($"{baseUrl}/screenshots/{outputFileName}");

                index++;
            }

            // Delete temp video
            try { File.Delete(inputPath); } catch { }

            // Auto-clean old files
            CleanOldFiles(tempFolder, TimeSpan.FromHours(1));
            CleanOldFiles(screenshotsFolder, TimeSpan.FromHours(1));

            return resultUrls;
        }

        // ================================
        // Timestamp Parser
        // ================================
        private static TimeSpan ParseTimestamp(string time)
        {
            var parts = time.Trim().Split(':');

            if (parts.Length == 1)
                return TimeSpan.FromSeconds(int.Parse(parts[0]));

            if (parts.Length == 2)
                return new TimeSpan(0, int.Parse(parts[0]), int.Parse(parts[1]));

            if (parts.Length == 3)
                return new TimeSpan(int.Parse(parts[0]), int.Parse(parts[1]), int.Parse(parts[2]));

            throw new ArgumentException($"Invalid time format: {time}");
        }

        // ================================
        // AUTO CLEAN OLD FILES (1 hour)
        // ================================
        private static void CleanOldFiles(string folder, TimeSpan maxAge)
        {
            if (!Directory.Exists(folder))
                return;

            var cutoff = DateTime.UtcNow - maxAge;

            foreach (var file in Directory.GetFiles(folder))
            {
                try
                {
                    var info = new FileInfo(file);
                    if (info.LastWriteTimeUtc < cutoff)
                        info.Delete();
                }
                catch
                {
                    // Never interrupt screenshot generation
                }
            }
        }
    }
}
