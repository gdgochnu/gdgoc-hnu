/**
 * ==============================================================================
 * GDGoC HNU OS — Google Drive Bridge (Google Apps Script)
 * Phase 13 — Steps 13.1 & 13.2
 * ==============================================================================
 * This script runs inside Google Apps Script under the chapter's Google Account.
 * It exposes a secure Web App endpoint for GDGoC HNU OS to manage Drive folders,
 * upload files, retrieve shareable links, and list directory contents.
 *
 * Security:
 * - Every request must include the shared secret token set in Script Properties:
 *   DRIVE_BRIDGE_SECRET
 * - Optional ROOT_FOLDER_ID in Script Properties to specify root workspace folder.
 *   If not set, a root folder "GDGoC HNU OS Workspace" is automatically created.
 */

// Configuration Keys in Script Properties
var PROP_SECRET = 'DRIVE_BRIDGE_SECRET';
var PROP_ROOT_FOLDER_ID = 'ROOT_FOLDER_ID';

/**
 * Handle HTTP GET (Health check / Ping)
 */
function doGet(e) {
  try {
    var authError = verifyAuth(e);
    if (authError) {
      return jsonResponse({ success: false, error: authError }, 401);
    }

    var rootFolder = getRootFolder();
    return jsonResponse({
      success: true,
      message: 'GDGoC HNU OS Drive Bridge is active',
      timestamp: new Date().toISOString(),
      rootFolderId: rootFolder.getId(),
      rootFolderName: rootFolder.getName(),
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

/**
 * Handle HTTP POST (Action Dispatcher)
 */
function doPost(e) {
  try {
    var payload;
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        return jsonResponse({ success: false, error: 'Malformed JSON payload: ' + parseErr.message }, 400);
      }
    } else {
      payload = e.parameter || {};
    }

    // 1. Verify Secret
    var authError = verifyAuth(e, payload);
    if (authError) {
      return jsonResponse({ success: false, error: authError }, 401);
    }

    var action = payload.action || (e.parameter ? e.parameter.action : '');
    if (!action) {
      return jsonResponse({ success: false, error: 'Missing "action" parameter in request' }, 400);
    }

    // 2. Dispatch actions
    switch (action) {
      case 'ping':
        return handlePing();

      case 'ensureFolderPath':
        return handleEnsureFolderPath(payload);

      case 'uploadFile':
        return handleUploadFile(payload);

      case 'listFiles':
        return handleListFiles(payload);

      case 'deleteFile':
        return handleDeleteFile(payload);

      case 'getShareableLink':
        return handleGetShareableLink(payload);

      default:
        return jsonResponse({
          success: false,
          error: 'Unknown action: ' + action + '. Valid actions: ping, ensureFolderPath, uploadFile, listFiles, deleteFile, getShareableLink'
        }, 400);
    }
  } catch (err) {
    return jsonResponse({ success: false, error: 'Exception in Drive Bridge: ' + err.toString() }, 500);
  }
}

/**
 * Verify Shared Secret Token
 */
function verifyAuth(e, payload) {
  var properties = PropertiesService.getScriptProperties();
  var configuredSecret = properties.getProperty(PROP_SECRET);

  // If secret not configured in script properties yet, warn and block
  if (!configuredSecret) {
    return 'Server configuration error: DRIVE_BRIDGE_SECRET property is not set in Script Properties.';
  }

  var incomingSecret = '';
  if (payload && payload.secret) {
    incomingSecret = payload.secret;
  } else if (e && e.parameter && e.parameter.secret) {
    incomingSecret = e.parameter.secret;
  }

  if (!incomingSecret || incomingSecret !== configuredSecret) {
    return 'Unauthorized: Invalid or missing shared secret token.';
  }

  return null;
}

/**
 * Get or automatically create the Chapter Root Workspace Folder
 */
function getRootFolder() {
  var properties = PropertiesService.getScriptProperties();
  var rootId = properties.getProperty(PROP_ROOT_FOLDER_ID);

  if (rootId) {
    try {
      return DriveApp.getFolderById(rootId);
    } catch (e) {
      // Folder may have been deleted or invalid ID; fall through to recreation
    }
  }

  // Look for existing folder with standard chapter name
  var folderName = 'GDGoC HNU OS Workspace';
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    var existingFolder = folders.next();
    properties.setProperty(PROP_ROOT_FOLDER_ID, existingFolder.getId());
    return existingFolder;
  }

  // Create new root folder
  var newRoot = DriveApp.createFolder(folderName);
  properties.setProperty(PROP_ROOT_FOLDER_ID, newRoot.getId());
  return newRoot;
}

/**
 * Action: ping
 */
function handlePing() {
  var root = getRootFolder();
  return jsonResponse({
    success: true,
    action: 'ping',
    status: 'online',
    timestamp: new Date().toISOString(),
    rootFolderId: root.getId(),
    rootFolderName: root.getName(),
    rootFolderUrl: root.getUrl(),
  });
}

/**
 * Action: ensureFolderPath
 * Creates or retrieves nested folder hierarchy starting from root.
 * Accepts payload: { pathSegments: ["Events", "2026", "Orientation"] } OR path: "Events/2026/Orientation"
 */
function handleEnsureFolderPath(payload) {
  var rawPath = payload.pathSegments || payload.path;
  var segments = [];

  if (Array.isArray(rawPath)) {
    segments = rawPath;
  } else if (typeof rawPath === 'string') {
    segments = rawPath.split('/').map(function(s) { return s.trim(); }).filter(Boolean);
  }

  if (segments.length === 0) {
    var root = getRootFolder();
    return jsonResponse({
      success: true,
      folderId: root.getId(),
      folderName: root.getName(),
      folderUrl: root.getUrl(),
      path: '/',
    });
  }

  var currentFolder = getRootFolder();
  var traversedPath = [];

  for (var i = 0; i < segments.length; i++) {
    var segmentName = segments[i];
    traversedPath.push(segmentName);

    var subFolders = currentFolder.getFoldersByName(segmentName);
    if (subFolders.hasNext()) {
      currentFolder = subFolders.next();
    } else {
      currentFolder = currentFolder.createFolder(segmentName);
    }
  }

  return jsonResponse({
    success: true,
    action: 'ensureFolderPath',
    folderId: currentFolder.getId(),
    folderName: currentFolder.getName(),
    folderUrl: currentFolder.getUrl(),
    path: '/' + traversedPath.join('/'),
  });
}

/**
 * Action: uploadFile
 * Accepts payload: {
 *   folderId: string (optional, defaults to root),
 *   fileName: string,
 *   mimeType: string,
 *   base64Data: string,
 *   makePublic: boolean (optional, default true)
 * }
 */
function handleUploadFile(payload) {
  if (!payload.fileName || !payload.base64Data) {
    return jsonResponse({ success: false, error: 'Missing required parameters: fileName and base64Data' }, 400);
  }

  var targetFolder;
  if (payload.folderId) {
    try {
      targetFolder = DriveApp.getFolderById(payload.folderId);
    } catch (e) {
      return jsonResponse({ success: false, error: 'Folder not found for id: ' + payload.folderId }, 404);
    }
  } else {
    targetFolder = getRootFolder();
  }

  var mimeType = payload.mimeType || 'application/octet-stream';
  var decodedBytes = Utilities.base64Decode(payload.base64Data);
  var blob = Utilities.newBlob(decodedBytes, mimeType, payload.fileName);

  var createdFile = targetFolder.createFile(blob);

  // Set sharing: Anyone with link can view (default true)
  if (payload.makePublic !== false) {
    try {
      createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      // Non-fatal if domain policies restrict external sharing
    }
  }

  return jsonResponse({
    success: true,
    action: 'uploadFile',
    fileId: createdFile.getId(),
    fileName: createdFile.getName(),
    mimeType: createdFile.getMimeType(),
    size: createdFile.getSize(),
    fileUrl: createdFile.getUrl(),
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + createdFile.getId(),
    folderId: targetFolder.getId(),
    folderName: targetFolder.getName(),
  });
}

/**
 * Action: listFiles
 * Accepts payload: { folderId: string (optional), limit: number }
 */
function handleListFiles(payload) {
  var targetFolder;
  if (payload.folderId) {
    try {
      targetFolder = DriveApp.getFolderById(payload.folderId);
    } catch (e) {
      return jsonResponse({ success: false, error: 'Folder not found for id: ' + payload.folderId }, 404);
    }
  } else {
    targetFolder = getRootFolder();
  }

  var limit = payload.limit || 50;
  var filesList = [];
  var fileIterator = targetFolder.getFiles();
  var count = 0;

  while (fileIterator.hasNext() && count < limit) {
    var f = fileIterator.next();
    filesList.push({
      id: f.getId(),
      name: f.getName(),
      mimeType: f.getMimeType(),
      size: f.getSize(),
      url: f.getUrl(),
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + f.getId(),
      dateCreated: f.getDateCreated().toISOString(),
      lastUpdated: f.getLastUpdated().toISOString(),
    });
    count++;
  }

  var foldersList = [];
  var folderIterator = targetFolder.getFolders();
  while (folderIterator.hasNext()) {
    var sub = folderIterator.next();
    foldersList.push({
      id: sub.getId(),
      name: sub.getName(),
      url: sub.getUrl(),
    });
  }

  return jsonResponse({
    success: true,
    action: 'listFiles',
    folderId: targetFolder.getId(),
    folderName: targetFolder.getName(),
    folderUrl: targetFolder.getUrl(),
    filesCount: filesList.length,
    files: filesList,
    folders: foldersList,
  });
}

/**
 * Action: deleteFile
 * Accepts payload: { fileId: string }
 */
function handleDeleteFile(payload) {
  if (!payload.fileId) {
    return jsonResponse({ success: false, error: 'Missing required parameter: fileId' }, 400);
  }

  try {
    var file = DriveApp.getFileById(payload.fileId);
    file.setTrashed(true);
    return jsonResponse({
      success: true,
      action: 'deleteFile',
      fileId: payload.fileId,
      message: 'File moved to trash successfully',
    });
  } catch (e) {
    return jsonResponse({ success: false, error: 'Could not delete file: ' + e.toString() }, 404);
  }
}

/**
 * Action: getShareableLink
 * Accepts payload: { fileId: string }
 */
function handleGetShareableLink(payload) {
  if (!payload.fileId) {
    return jsonResponse({ success: false, error: 'Missing required parameter: fileId' }, 400);
  }

  try {
    var file = DriveApp.getFileById(payload.fileId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return jsonResponse({
      success: true,
      action: 'getShareableLink',
      fileId: file.getId(),
      name: file.getName(),
      shareableUrl: file.getUrl(),
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId(),
    });
  } catch (e) {
    return jsonResponse({ success: false, error: 'Could not retrieve shareable link: ' + e.toString() }, 404);
  }
}

/**
 * Helper: Output JSON HTTP response
 */
function jsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
