using System.IO;
using Keepshot.Api.Services;
using Microsoft.AspNetCore.Http.Features;
using Xabe.FFmpeg;

var builder = WebApplication.CreateBuilder(args);
var corsPolicyName = "Frontend";

// ---- Upload limits (same as before) ----
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 200L * 1024 * 1024;
});

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 200L * 1024 * 1024;
});

// ---- CORS: allow localhost:5173 (and later your real frontend domain) ----
builder.Services.AddCors(options =>
{
    options.AddPolicy(corsPolicyName, policy =>
        policy
            .WithOrigins(
                "http://localhost:5173"        // Vite dev server
                                               // ,"https://your-frontend-domain.com"  // add later
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
    );
});

// ---- FFmpeg path: different for local vs Azure ----
if (builder.Environment.IsDevelopment())
{
    // your local machine path
    FFmpeg.SetExecutablesPath(@"C:\tools\ffmpeg\bin");
}
else
{
    // On Azure: put ffmpeg/ffprobe binaries in a folder called "ffmpeg"
    // inside the API project, and mark them as "Copy to Output Directory".
    var ffmpegFolder = Path.Combine(builder.Environment.ContentRootPath, "ffmpeg");
    FFmpeg.SetExecutablesPath(ffmpegFolder);
}

// ---- Services / MVC ----
builder.Services.AddScoped<IVideoProcessingService, VideoProcessingService>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Swagger only in Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// IMPORTANT: CORS must be early in the pipeline
app.UseCors(corsPolicyName);

// Static files (screenshots) – also include CORS header
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append(
            "Access-Control-Allow-Origin",
            "http://localhost:5173"
        );
    }
});

app.UseAuthorization();
app.MapControllers();
app.Run();
