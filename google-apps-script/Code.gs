/**
 * ==============================================================================
 * GDGoC HNU OS — Google Drive & Calendar Bridge (Google Apps Script)
 * Phase 13 (Drive) & Phase 14 (Calendar — Spec §4.17)
 * ==============================================================================
 */

// Configuration Keys in Script Properties
var PROP_SECRET = 'DRIVE_BRIDGE_SECRET';
var PROP_ROOT_FOLDER_ID = 'ROOT_FOLDER_ID';
var PROP_CALENDAR_ID = 'SHARED_CALENDAR_ID';

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
      message: 'GDGoC HNU OS Drive & Calendar Bridge is active',
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

      case 'renameFile':
        return handleRenameFile(payload);

      case 'getShareableLink':
        return handleGetShareableLink(payload);

      case 'getSharedCalendar':
        return handleGetSharedCalendar(payload);

      case 'createCalendarEvent':
        return handleCreateCalendarEvent(payload);

      case 'updateCalendarEvent':
        return handleUpdateCalendarEvent(payload);

      case 'deleteCalendarEvent':
        return handleDeleteCalendarEvent(payload);

      default:
        return jsonResponse({
          success: false,
          error: 'Unknown action: ' + action + '. Valid actions: ping, ensureFolderPath, uploadFile, listFiles, deleteFile, renameFile, getShareableLink, getSharedCalendar, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent'
        }, 400);
    }
  } catch (err) {
    return jsonResponse({ success: false, error: 'Exception in Bridge: ' + err.toString() }, 500);
  }
}

/**
 * Verify Shared Secret Token
 */
function verifyAuth(e, payload) {
  var properties = PropertiesService.getScriptProperties();
  var configuredSecret = properties.getProperty(PROP_SECRET);

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
    } catch (e) {}
  }

  var folderName = 'GDGoC HNU OS Workspace';
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    var existingFolder = folders.next();
    properties.setProperty(PROP_ROOT_FOLDER_ID, existingFolder.getId());
    return existingFolder;
  }

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

  if (payload.makePublic !== false) {
    try {
      createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {}
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
    thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + createdFile.getId() + '&sz=w800',
    folderId: targetFolder.getId(),
    folderName: targetFolder.getName(),
  });
}

/**
 * Action: listFiles
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
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w800',
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
 * Action: renameFile
 */
function handleRenameFile(payload) {
  if (!payload.fileId || !payload.newName) {
    return jsonResponse({ success: false, error: 'Missing required parameters: fileId and newName' }, 400);
  }

  try {
    var file = DriveApp.getFileById(payload.fileId);
    file.setName(payload.newName);
    return jsonResponse({
      success: true,
      action: 'renameFile',
      fileId: file.getId(),
      newName: file.getName(),
      url: file.getUrl(),
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId(),
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w800',
    });
  } catch (e) {
    return jsonResponse({ success: false, error: 'Could not rename file: ' + e.toString() }, 500);
  }
}

/**
 * Action: getShareableLink
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
 * ==============================================================================
 * Google Calendar Integration Handlers (Phase 14 — Spec §4.17)
 * ==============================================================================
 */
function getOrCreateSharedCalendar() {
  var properties = PropertiesService.getScriptProperties();
  var calId = properties.getProperty(PROP_CALENDAR_ID);

  if (calId) {
    try {
      var cal = CalendarApp.getCalendarById(calId);
      if (cal) return cal;
    } catch (e) {}
  }

  var cals = CalendarApp.getCalendarsByName('GDGoC HNU');
  if (cals.length > 0) {
    properties.setProperty(PROP_CALENDAR_ID, cals[0].getId());
    return cals[0];
  }

  var newCal = CalendarApp.createCalendar('GDGoC HNU', {
    timeZone: 'Africa/Cairo',
    summary: 'Official Google Developer Groups on Campus - Helwan National University Shared Calendar'
  });
  properties.setProperty(PROP_CALENDAR_ID, newCal.getId());
  return newCal;
}

function handleGetSharedCalendar(payload) {
  var cal = getOrCreateSharedCalendar();
  var calId = cal.getId();
  var subscribableLink = 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(calId);
  var icalUrl = 'https://calendar.google.com/calendar/ical/' + encodeURIComponent(calId) + '/public/basic.ics';

  return jsonResponse({
    success: true,
    action: 'getSharedCalendar',
    calendarId: calId,
    calendarName: cal.getName(),
    timeZone: cal.getTimeZone(),
    subscribableLink: subscribableLink,
    icalUrl: icalUrl
  });
}

function handleCreateCalendarEvent(payload) {
  if (!payload.title || !payload.startTime) {
    return jsonResponse({ success: false, error: 'Missing title or startTime for calendar event' }, 400);
  }

  var cal = getOrCreateSharedCalendar();
  var start = new Date(payload.startTime);
  var end = payload.endTime ? new Date(payload.endTime) : new Date(start.getTime() + 60 * 60 * 1000);

  var options = {
    description: payload.description || '',
    location: payload.location || ''
  };

  var event;
  if (payload.isAllDay) {
    event = cal.createAllDayEvent(payload.title, start, options);
  } else {
    event = cal.createEvent(payload.title, start, end, options);
  }

  return jsonResponse({
    success: true,
    action: 'createCalendarEvent',
    eventId: event.getId(),
    title: event.getTitle(),
    startTime: event.getStartTime().toISOString(),
    endTime: event.getEndTime().toISOString(),
    htmlLink: 'https://calendar.google.com/calendar/event?eid=' + Utilities.base64Encode(event.getId())
  });
}

function handleUpdateCalendarEvent(payload) {
  if (!payload.eventId) {
    return jsonResponse({ success: false, error: 'Missing eventId' }, 400);
  }

  var cal = getOrCreateSharedCalendar();
  var event = cal.getEventById(payload.eventId);
  if (!event) {
    return jsonResponse({ success: false, error: 'Calendar event not found' }, 404);
  }

  if (payload.title) event.setTitle(payload.title);
  if (payload.description !== undefined) event.setDescription(payload.description);
  if (payload.location !== undefined) event.setLocation(payload.location);
  if (payload.startTime && payload.endTime) {
    event.setTime(new Date(payload.startTime), new Date(payload.endTime));
  }

  return jsonResponse({
    success: true,
    action: 'updateCalendarEvent',
    eventId: event.getId(),
    title: event.getTitle()
  });
}

function handleDeleteCalendarEvent(payload) {
  if (!payload.eventId) {
    return jsonResponse({ success: false, error: 'Missing eventId' }, 400);
  }

  var cal = getOrCreateSharedCalendar();
  var event = cal.getEventById(payload.eventId);
  if (event) {
    event.deleteEvent();
  }

  return jsonResponse({
    success: true,
    action: 'deleteCalendarEvent',
    eventId: payload.eventId,
    message: 'Event deleted from calendar successfully'
  });
}

/**
 * Helper: Output JSON HTTP response
 */
function jsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
