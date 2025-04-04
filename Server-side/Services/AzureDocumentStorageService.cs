using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Specialized;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Syncfusion.EJ2.DocumentEditor;
using CollaborativeEditingServerSide.Model;
using Syncfusion.EJ2.FileManager.Base;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace CollaborativeEditingServerSide.Service
{
    public interface IAzureDocumentStorageService
    {
        object ManageDocument(FileManagerDirectoryContent args);

    }

    /// <summary>
    /// Service for handling Azure storage operations using Syncfusion components
    /// </summary>
    public class AzureDocumentStorageService : IAzureDocumentStorageService
    {
        private readonly string _accountName;
        private readonly string _accountKey;
        private readonly string _containerName;
        private readonly ILogger<AzureDocumentStorageService> _logger;
        private readonly AzureDocumentManager _fileProvider;
        private readonly string _rootFolderName;

        /// <summary>
        /// Initializes Azure storage configuration and file provider
        /// </summary>
        /// <param name="configuration">Application configuration settings</param>
        /// <param name="logger">Logger instance for error tracking</param>
        public AzureDocumentStorageService(
            IConfiguration configuration,
            ILogger<AzureDocumentStorageService> logger)
        {
            // Retrieve necessary configuration values for connecting to Azure storage.
            _accountName = configuration["accountName"];
            _accountKey = configuration["accountKey"];
            _containerName = configuration["containerName"];
            _logger = logger;
            //Folder name created inside the container
            _rootFolderName = "Files";
            // Initialize Syncfusion Azure File Provider instance.
            _fileProvider = new AzureDocumentManager();

            // Define the base URL for the blob storage using the container name.
            var basePath = $"https://documenteditorstorage.blob.core.windows.net/{_containerName}";
            // Define the file path by appending the root folder name to the base path.
            var filePath = $"{basePath}/{_rootFolderName}";
            // Remove any '../' sequences from the paths to prevent directory traversal vulnerabilities.
            basePath = basePath.Replace("../", "");
            filePath = filePath.Replace("../", "");
            // Ensure basePath ends with exactly one trailing slash.
            basePath = (basePath.Substring(basePath.Length - 1) != "/") ? basePath + "/" : basePath.TrimEnd(new[] { '/', '\\' }) + "/";
            // Ensure filePath does not end with a trailing slash.
            filePath = (filePath.Substring(filePath.Length - 1) == "/") ? filePath.TrimEnd(new[] { '/', '\\' }) : filePath;

            // Set the base blob container path for the file provider.
            _fileProvider.SetBlobContainer(basePath, filePath);
            // Register the Azure storage credentials and container name.
            _fileProvider.RegisterAzure(_accountName, _accountKey, _containerName);

            //----------
            //For example 
            //_fileProvider.setBlobContainer("https://azure_service_account.blob.core.windows.net/{containerName}/", "https://azure_service_account.blob.core.windows.net/{containerName}/Files");
            //_fileProvider.RegisterAzure("azure_service_account", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "containerName");
            // Note: we need to create a Root folder inside the container and the documents inside the root folder can be accessed.
            //---------
        }

        /// <summary>
        /// Executes file management operations against Azure storage
        /// </summary>
        /// <param name="args">Operation parameters including action type and paths</param>
        /// <returns>Operation result in camelCase format</returns>
        /// <exception cref="Exception">Thrown for Azure storage operation failures</exception>
        public object ManageDocument(FileManagerDirectoryContent args)
        {
            try
            {
                // Normalize the incoming paths to ensure they are in the expected format.
                NormalizeDocumentPaths(ref args);
                // Determine the action and execute the corresponding method on the file provider.
                return args.Action switch
                {
                    "read" => _fileProvider.ToCamelCase(_fileProvider.GetFiles(args.Path, args.ShowHiddenItems, args.Data)),
                    "delete" => _fileProvider.ToCamelCase(_fileProvider.Delete(args.Path, args.Names, args.Data)),
                    "details" => _fileProvider.ToCamelCase(_fileProvider.Details(args.Path, args.Names, args.Data)),
                    "search" => _fileProvider.ToCamelCase(_fileProvider.Search(
                        args.Path, args.SearchString, args.ShowHiddenItems, args.CaseSensitive, args.Data)),
                    "copy" => _fileProvider.ToCamelCase(_fileProvider.Copy(
                        args.Path, args.TargetPath, args.Names, args.RenameFiles, args.TargetData, args.Data)),
                    _ => null
                };
            }
            catch (Exception ex)
            {
                // Log any errors encountered during file operations.
                _logger.LogError(ex, "File operation failed");
                throw;
            }
        }

        /// <summary>
        /// Normalizes Azure blob paths for Syncfusion file provider compatibility
        /// </summary>
        /// <param name="args">FileManagerDirectoryContent reference to modify</param>
        private void NormalizeDocumentPaths(ref FileManagerDirectoryContent args)
        {
            if (string.IsNullOrEmpty(args.Path)) return;

            // Define the base path used in the blob storage URL.
            var basePath = $"https://documenteditorstorage.blob.core.windows.net/{_containerName}/";
            var originalPath = $"{basePath}{_rootFolderName}".Replace(basePath, "");

            args.Path = args.Path.Contains(originalPath)
                ? args.Path.Replace("//", "/")
                : $"{originalPath}{args.Path}".Replace("//", "/");

            args.TargetPath = $"{originalPath}{args.TargetPath}".Replace("//", "/");
        }
        
    }
}