using System.IO;
using Keepshot.Api.Services;
using Microsoft.AspNetCore.Http.Features;
using Xabe.FFmpeg;

var builder = WebApplication.CreateBuilder(args);
var corsPolicyName = "Frontend";

// ---- Upload limits ----
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 200L * 1024 * 1024;
});

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 200L * 1024 * 1024;
});

// ---- CORS ----
builder.Services.AddCors(options =>
{
    options.AddPolicy(corsPolicyName, policy =>
        policy
            .WithOrigins("http://localhost:5173",
            "https://purple-cliff-05f41db10.3.azurestaticapps.net",
            "https://www.keepshot.io")   // Vite dev
            .AllowAnyHeader()
            .AllowAnyMethod()
    );
});

// ---- FFmpeg path: local vs Azure ----
if (builder.Environment.IsDevelopment())
{
    FFmpeg.SetExecutablesPath(@"C:\tools\ffmpeg\bin");
}
else
{
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

// CORS early in pipeline
app.UseCors(corsPolicyName);

// Static files (screenshots) – still fine to leave as-is
app.UseStaticFiles();

app.UseAuthorization();
app.MapControllers();
app.Run();
