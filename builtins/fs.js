// nothing to see here... no file methods for the browser

// global fs ref
var _fs = null;

function onInitFs(fs) {
  console.log("opened fs "+fs);
  _fs = fs;
}

function withFileSystem(onInitFs) {
  if (_fs) {
    onInitFs(_fs);
  } else {
    window.webkitStorageInfo.requestQuota(PERSISTENT, 1024*1024, function(grantedBytes) {
      window.webkitRequestFileSystem(PERSISTENT, grantedBytes, onInitFs, errorHandler);
    }, function(e) {
      errorHandler(e);
    });
  };
};

// Return a fake writer synchronously.
// You can use it like a node.js file write stream.
function makeStreamAdapter() {
  var writeBuffer = [];
  var fakeStream = {};
  fakeStream.write = function (str, enc) {
    if (enc != 'utf8') {
      throw new Error("FakeStream wants utf8");
    }
    writeBuffer.push(str);
  };
  // make it real
  fakeStream.realize = function (fileWriter) {
    fakeStream.fileWriter = fileWriter;
    fakeStream.write = function (str, enc) {
      if (enc != 'utf8') {
        throw new Error("FakeStream wants utf8");
      }
      // blobs? are you for fucking real?
      var bb = new WebKitBlobBuilder();
      while (writeBuffer.length) {
        bb.append(writeBuffer.shift());
      }
      bb.append(str);
      var blob = bb.getBlob('text/plain');
      fileWriter.write(blob);
    };
    if (writeBuffer.length) {
      fakeStream.write('', 'utf8');
    }
  };
  return fakeStream;
};

exports.createWriteStream = function (path, options) {
  var fakeStream = makeStreamAdapter();
  withFileSystem(function(fs) {
    // TODO handle options
    fs.root.getFile(path, {create:true}, function(fileEntry) {
      // Create a FileWriter object for our FileEntry
      fileEntry.createWriter(function(fileWriter) {
        fileWriter.onwriteend = function(e) {
          console.log('Write completed.');
        };
        fileWriter.onerror = function(e) {
          console.log('Write failed: ' + e.toString());
        };
        fakeStream.realize(fileWriter);
      }, errorHandler);
    });
  });
  return fakeStream;
};

function errorHandler(e) {
  var msg = '';
  switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
      msg = 'QUOTA_EXCEEDED_ERR';
      break;
    case FileError.NOT_FOUND_ERR:
      msg = 'NOT_FOUND_ERR';
      break;
    case FileError.SECURITY_ERR:
      msg = 'SECURITY_ERR';
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msg = 'INVALID_MODIFICATION_ERR';
      break;
    case FileError.INVALID_STATE_ERR:
      msg = 'INVALID_STATE_ERR';
      break;
    default:
      msg = 'Unknown Error';
      break;
  };
  console.log('Error: ' + msg);
}

