using Microsoft.AspNetCore.Mvc;
using Keepshot.Api.Services;

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
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Extract(
            [FromForm] IFormFile file,
            [FromForm] string time)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest("File is required.");

                if (string.IsNullOrWhiteSpace(time))
                    return BadRequest("Time is required.");

                var imageUrl = await _videoService.ExtractFrameAsync(file, time, Request);

                return Ok(new { imageUrl });
            }
            catch (Exception ex)
            {
                Console.WriteLine("ERROR in /api/video/extract:");
                Console.WriteLine(ex.ToString());
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("extract-multiple")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> ExtractMultiple(
            [FromForm] IFormFile file,
            [FromForm(Name = "times")] List<string> times)
        {
            try
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
            catch (Exception ex)
            {
                Console.WriteLine("ERROR in /api/video/extract-multiple:");
                Console.WriteLine(ex.ToString());
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
