var uM = (function() {
    var options = arguments[0] ;
    //pri
    var maxConnection = 3 ;
    var qList = [] ;
    var doneList = [] ;
    var getCache = function() {
    } ;
    var pick = function() {
        var mObj = this ;
        var count = 0 ;
        //TODO: 少一個排序的動作
        $.each(qList, function(idx, taskObj) {
            if (taskObj.attributes('status') === uComm.status[1]) {  //uploading
                count++ ;
            }
            if (count>=maxConnection) return false ;
        }) ;
        
        $.each(qList, function(idx, taskObj) {
            
            if (count<maxConnection) {
                if (taskObj.attributes('status') === uComm.status[0]) {  //uploading
                    startTask.apply(this, [taskObj]) ;
                    count++ ;
                }
                
            } else {
                return false ;
            }
            
        }) ;        
    } ;
    
    var startTask = function(taskObj) {
        var mObj = this ;

        if (taskObj.status===uComm.status[2]) return false ;  //pause
        
        //prepare binary file
        var formdata = new FormData() ;
        var blob = taskObj.file.slice(taskObj.uploadedBytes, taskObj.uploadedBytes+taskObj.chunkSize) ;
        formdata.append('file', blob) ;

        //prepare query string
        var getQString = function() {
            return '' ;
            var str = '' ;

            var okArray = [
                'fileId',
                'fileName',
                'totalBytes',
                'uploadedBytes',
                'chunkSize',
                'chunkId',
                'totalChunk',
                'type',
            ] ;
            
            $.each(okArray, function(idx, attr) {
                
                str += ('&'+attr+'='+taskObj[attr]) ;
            }) ;

            return str ;
            
        } ;
        
        taskObj.update({  //uploading
            status: uComm.status[1]
        }) ;
        
        var opt = {
            
            xhr: function() {
                var xhrobj = $.ajaxSettings.xhr();
                if (xhrobj.upload) {
                        xhrobj.upload.addEventListener('progress', function(event) {
console.log(event.loaded) ;
                            taskObj.update({  //uploading
                                uploadedBytes: event.loaded,
                                lastDate: new Date()
                            }) ;
                            
                        }, false);
                }
                return xhrobj;
            },
            beforeSend: function( xhr ) {
                xhr.overrideMimeType('application/octet-stream');
                xhr.setRequestHeader("Content-Transfer-Encoding", "chunked");
                xhr.setRequestHeader('Range', 'bytes=' + taskObj.uploadedBytes + '-') ;
                //xhr.setRequestHeader("Transfer-Encoding", "chunked");
                //xhr.setRequestHeader('Content-Range', 'bytes ' + taskObj.uploadedBytes + '-' + taskObj.totalBytes + '/' + taskObj.totalBytes);
            },
            url: taskObj.target+'?'+getQString(),
            method: 'POST',
            contentType:false,
            processData: false,
            cache: false,
            data: formdata,
            filename: taskObj.fileId,
            timeout: false,
        } ;
        taskObj.request = $.ajax(opt)
            .done(function(resp) {
                
                uploadDoneCallback.apply(this, [taskObj]) ;
                
            }) ;
    } ;
    var pauseTask = function() {
    } ;
    var finishTask = function(taskObj) {
        var mObj = this ;
        
        var remove = [] ;
        
        $.each(qList, function(idx, _taskObj) {
            if (_taskObj.fileId === taskObj.fileId) {
                remove.push(idx) ;
                //var theTaskObj = qList.splice(idx, 1) ;
                doneList.push(new uFT(qList[idx])) ;
            }
        }) ;
        
        if (remove.length) {
            $.each(remove, function(idx, _idx) {
                qList.splice(_idx, 1) ;
            }) ;
        }
        //
        pick.apply(this, []) ;
    } ;
    var uploadDoneCallback = function(taskObj) {
        var mObj = this ;

        finishTask.apply(this, [taskObj]) ;
        
    } ;
    var uploadAllDoneCallback = function() {
    } ;
    function Plugin(options) {
        //constructor
        //getCache.apply(this, []) ;
    }
    //public
    Plugin.prototype.add = function(taskObj) {
        qList.push(taskObj) ;
        pick.apply(this, []) ;
    } ;
    
    Plugin.prototype.start = function(taskObj) {
        if (!taskObj) return false ;
        
        taskObj.update({
            status: uComm.status[1]
        }) ;
        
        startTask.apply(this, [taskObj]) ;
    } ;
    Plugin.prototype.pause = function(taskObj) {
        var mObj = this ;

        if (!taskObj) return false ;
        
        taskObj.update({
            status: uComm.status[2]
        }) ;
        
        taskObj.request.abort() ;
    } ;
    Plugin.prototype.delete = function(taskObj) {
        var mObj = this ;

        if (!taskObj) return false ;
        
        taskObj.request.abort() ;
        
        //拿掉
        $.each(qList, function(idx, _taskObj) {
            if (_taskObj.fileId === taskObj.fileId) {

                var theTaskObj = qList.splice(idx, 1) ;
                
            }
        }) ;
    } ;
    
    Plugin.prototype.getTasks = function() {
        return qList ;
    } ;
    Plugin.prototype.getFTasks = function() {
        return doneList ;
    } ;
    return new Plugin(options) ;
})() ;
var uComm = (function() {
    var options = arguments[0] ;
    function Plugin() {
        this.priority = ['SUPER', 'HIGH', 'MEDIUM', 'LOW'] ;
        this.status = ['WAITING', 'UPLOADING', 'PAUSE'] ;
    }
    return new Plugin(options) ;
})() ;
var uT = (function() {
    var optionsParser = function() {
        this.fileId = this.file.size+' '+this.file.name ;
        this.fileName = this.file.name ;
        //this.fileSource = this.file ;
        this.creationDate = new Date() ;
        this.lastDate = new Date() ;
        this.totalBytes = this.file.size ;
        this.uploadedBytes = 0 ;
        this.status = uComm.status[0] ;
        
        //this.size = 1024*1024 ;  //1024*1024
        //this.chunkId = 1 ;
        //this.totalChunk = Math.ceil(this.file.size/this.chunkSize) ;
        
        this.request = '' ;
        this.type = this.file.type ;
        //wait for deprivate
        this.age = 1 ;
        this.priority = 1 ;
    } ;
    function Plugin(options) {
        this.target = options.target ;
        this.file = options.file ;
        optionsParser.apply(this, []) ;
    }
    Plugin.prototype.attributes = function() {
        var taskObj = this ;
        var options = arguments[0] ;
        //debugger ;
        if (options) {
            if (typeof options === 'string') {
                return this[options] ;
            } else {
                var rtnObj = {} ;
                $.each(options, function(idx, property) {
                    rtnObj[property] = taskObj[property] ;
                }) ;
                return rtnObj ;
            }
        } else{
            var rtnObj = {} ;
            $.each(taskObj, function(property, value) {
                rtnObj[property] = value ;
            }) ;
            return rtnObj ;
        }
    } ;
    Plugin.prototype.update = function(options) {
        var taskObj = this ;
        if (options) {
            
            $.each(options, function(attr, value) {
                if (taskObj[attr] !== undefined) taskObj[attr] = value ;
            }) ;
        }
    } ;
    
    return Plugin ;
})() ;
var uFT = (function() {
    function Plugin(taskObj) {
        this.target = taskObj.target ;
        this.fileId = taskObj.fileId ;
        this.fileName = taskObj.fileName ;
        this.creationDate = taskObj.creationDate ;
        this.lastDate = taskObj.lastDate ;
        this.totalBytes = taskObj.totalBytes ;
        this.uploadedBytes = taskObj.uploadedBytes ;
        this.chunkSize = taskObj.chunkSize ;
        this.totalChunk = taskObj.totalChunk ;
        this.type = taskObj.type ;
    }
    Plugin.prototype.attributes = function() {
        var taskObj = this ;
        var options = arguments[0] ;
        //debugger ;
        if (options) {
            if (typeof options === 'string') {
                return this[options] ;
            } else {
                var rtnObj = {} ;
                $.each(options, function(idx, property) {
                    rtnObj[property] = taskObj[property] ;
                }) ;
                return rtnObj ;
            }
        } else{
            var rtnObj = {} ;
            $.each(taskObj, function(property, value) {
                rtnObj[property] = value ;
            }) ;
            return rtnObj ;
        }
    } ;
    return Plugin ;
})() ;