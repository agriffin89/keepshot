using Microsoft.AspNetCore.Http;

namespace Keepshot.Api.Services
{
    public interface IVideoProcessingService
    {
        Task<string> ExtractFrameAsync(IFormFile file, string time, HttpRequest request);

        Task<List<string>> ExtractFramesAsync(
            IFormFile file,
            IEnumerable<string> times,
            HttpRequest request);
    }
}
