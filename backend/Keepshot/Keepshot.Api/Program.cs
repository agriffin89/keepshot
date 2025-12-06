using Xabe.FFmpeg;
using Keepshot.Api.Services;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Builder;      // para StaticFileOptions
using Microsoft.AspNetCore.StaticFiles;   // opcional, por si lo pide

var builder = WebApplication.CreateBuilder(args);
var corsPolicyName = "KeepshotCors";

// Allow larger uploads (e.g. up to 200 MB)
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 200 * 1024 * 1024;
});

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 200L * 1024 * 1024;
});

// Tell Xabe where ffmpeg.exe is located
//  NOTE: this path only exists on your local machine.
// For Azure you’ll later need a different path or bundle ffmpeg with the app.
FFmpeg.SetExecutablesPath(@"C:\tools\ffmpeg\bin");

// CORS so React (5173) can call this API
builder.Services.AddCors(options =>
{
    options.AddPolicy(corsPolicyName, policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173",
            "https://keepshot-api-adbufeg3hegng3h6.mexicocentral-01.azurewebsites.net"
            )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); ;
    });
});

builder.Services.AddHttpsRedirection(options =>
{
    options.HttpsPort = 443;
});

// Register services
builder.Services.AddScoped<IVideoProcessingService, VideoProcessingService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Enable Swagger always (local + Azure)
app.UseSwagger();
app.UseSwaggerUI();

// No HTTPS redirection in dev
// app.UseHttpsRedirection();

// Static files with CORS header so React can fetch screenshots
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

app.UseCors(corsPolicyName);

app.UseAuthorization();

app.UseStaticFiles();

app.MapControllers();

app.Run();
