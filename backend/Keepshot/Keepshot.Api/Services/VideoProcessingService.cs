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

            // 2) Read media info ONCE (duration + fps)
            var mediaInfo = await FFmpeg.GetMediaInfo(inputPath);
            var maxDuration = mediaInfo.Duration;

            var videoStream = mediaInfo.VideoStreams?.FirstOrDefault();
            if (videoStream == null)
                throw new InvalidOperationException("No video stream found in the uploaded file.");

            var fps = GetSafeFps(videoStream);

            // 3) Parse timestamp (supports frames)
            var timestamp = ParseTimestamp(time, fps, maxDuration);

            // 4) Clamp
            timestamp = ClampToDuration(timestamp, maxDuration);

            // 5) Output screenshot path
            var outputFileName = $"keepshot_{Guid.NewGuid():N}.jpg";
            var outputPath = Path.Combine(screenshotsFolder, outputFileName);

            // 6) Snapshot
            var conversion = await FFmpeg.Conversions.FromSnippet
                .Snapshot(inputPath, outputPath, timestamp);

            conversion.SetOverwriteOutput(true);
            await conversion.Start();

            // 7) Cleanup temp video
            try { File.Delete(inputPath); } catch { }

            // Auto-clean old files
            CleanOldFiles(tempFolder, TimeSpan.FromHours(1));
            CleanOldFiles(screenshotsFolder, TimeSpan.FromHours(1));

            // 8) Build public URL
            var baseUrl = $"{request.Scheme}://{request.Host}";
            return $"{baseUrl}/screenshots/{outputFileName}";
        }

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

            // Read media info once
            var mediaInfo = await FFmpeg.GetMediaInfo(inputPath);
            var maxDuration = mediaInfo.Duration;

            var videoStream = mediaInfo.VideoStreams?.FirstOrDefault();
            if (videoStream == null)
                throw new InvalidOperationException("No video stream found in the uploaded file.");

            var fps = GetSafeFps(videoStream);

            var resultUrls = new List<string>();
            var index = 0;

            foreach (var raw in times)
            {
                if (string.IsNullOrWhiteSpace(raw)) continue;

                var timestamp = ParseTimestamp(raw, fps, maxDuration);
                timestamp = ClampToDuration(timestamp, maxDuration);

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

            // Cleanup temp video
            try { File.Delete(inputPath); } catch { }

            // Auto-clean old files
            CleanOldFiles(tempFolder, TimeSpan.FromHours(1));
            CleanOldFiles(screenshotsFolder, TimeSpan.FromHours(1));

            return resultUrls;
        }

        // ================================
        // Timestamp Parser (supports frames)
        //
        // Supports:
        //  - "SS"
        //  - "MM:SS"
        //  - "HH:MM:SS"
        //  - "MM:SS:FF"      (FF 0–120)
        //  - "HH:MM:SS:FF"   (FF 0–120)
        //
        // Rule for 3 parts (A:B:C):
        //  - if video < 1 hour => MM:SS:FF
        //  - else              => HH:MM:SS
        // ================================
        private static TimeSpan ParseTimestamp(string input, double fps, TimeSpan videoDuration)
        {
            if (string.IsNullOrWhiteSpace(input))
                throw new ArgumentException("Time is required.");

            var parts = input.Trim().Split(':', StringSplitOptions.RemoveEmptyEntries);

            if (fps <= 0.1) fps = 30.0;

            static int ParseInt(string s, string full)
            {
                if (!int.TryParse(s, out var v))
                    throw new ArgumentException($"Invalid time format: {full}");
                return v;
            }

            if (parts.Length == 1)
            {
                // SS
                var ss = ParseInt(parts[0], input);
                return TimeSpan.FromSeconds(ss);
            }

            if (parts.Length == 2)
            {
                // MM:SS
                var mm = ParseInt(parts[0], input);
                var ss = ParseInt(parts[1], input);
                return new TimeSpan(0, mm, ss);
            }

            if (parts.Length == 3)
            {
                // Ambiguous: HH:MM:SS vs MM:SS:FF
                // Use duration rule:
                // - short videos => MM:SS:FF
                // - long videos  => HH:MM:SS
                var a = ParseInt(parts[0], input);
                var b = ParseInt(parts[1], input);
                var c = ParseInt(parts[2], input);

                if (videoDuration < TimeSpan.FromHours(1))
                {
                    // MM:SS:FF
                    var mm = a;
                    var ss = b;
                    var ff = c;

                    ValidateFrames(ff);

                    var baseTime = new TimeSpan(0, mm, ss);
                    return baseTime + TimeSpan.FromSeconds(ff / fps);
                }
                else
                {
                    // HH:MM:SS
                    var hh = a;
                    var mm = b;
                    var ss = c;
                    return new TimeSpan(hh, mm, ss);
                }
            }

            if (parts.Length == 4)
            {
                // HH:MM:SS:FF
                var hh = ParseInt(parts[0], input);
                var mm = ParseInt(parts[1], input);
                var ss = ParseInt(parts[2], input);
                var ff = ParseInt(parts[3], input);

                ValidateFrames(ff);

                var baseTime = new TimeSpan(hh, mm, ss);
                return baseTime + TimeSpan.FromSeconds(ff / fps);
            }

            throw new ArgumentException($"Invalid time format: {input}");
        }

        private static void ValidateFrames(int ff)
        {
            if (ff < 0 || ff > 120)
                throw new ArgumentException("Frames (FF) must be between 0 and 120.");
        }

        private static TimeSpan ClampToDuration(TimeSpan timestamp, TimeSpan maxDuration)
        {
            if (timestamp <= maxDuration) return timestamp;

            var safe = maxDuration - TimeSpan.FromSeconds(1);
            if (safe < TimeSpan.Zero) safe = TimeSpan.Zero;
            return safe;
        }

        private static double GetSafeFps(IVideoStream videoStream)
        {
            double fps = 30.0;

            try
            {
                var candidate = videoStream.Framerate;
                if (candidate > 0.1) fps = candidate;
            }
            catch
            {
                // keep fallback
            }

            return fps;
        }

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
