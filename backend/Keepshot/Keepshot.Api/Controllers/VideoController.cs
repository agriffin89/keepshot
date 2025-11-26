using Keepshot.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Keepshot.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VideoController : ControllerBase
    {
        private readonly IVideoProcessingService _videoService;

        public VideoController(IVideoProcessingService videoService)
        {
            _videoService = videoService;
        }

        [HttpPost("extract")]
        public async Task<IActionResult> Extract(
            [FromForm] IFormFile file,
            [FromForm] string time)
        {
            if (file == null || file.Length == 0)
                return BadRequest("File is required.");

            if (string.IsNullOrWhiteSpace(time))
                return BadRequest("Time is required.");

            var imageUrl = await _videoService.ExtractFrameAsync(file, time, Request);

            return Ok(new { imageUrl });
        }

        // 👇 NEW: multi-screenshot endpoint
        [HttpPost("extract-multiple")]
        public async Task<IActionResult> ExtractMultiple(
            [FromForm] IFormFile file,
            [FromForm] List<string> times)
        {
            if (file == null || file.Length == 0)
                return BadRequest("File is required.");

            if (times == null || times.Count == 0)
                return BadRequest("At least one time is required.");

            var imageUrls = await _videoService.ExtractFramesAsync(file, times, Request);

            if (imageUrls.Count == 0)
                return BadRequest("No valid times were provided.");

            return Ok(new { imageUrls });
        }
    }
}
