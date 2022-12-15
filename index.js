"use strict";


/* -------------------------------------------------------------------------------
 * accepts multiple folders in arguments.
 * lists all files in all folders in parallel. 
 * process all files in each folder in parallel (read, search patterns, edit).
 *
 * Windows only. uses DIR (instead of NodeJS built-in file-enumeration),  
 * may be adjusted for linux (ls, or find).
 *
 * note: no backup files.  
 * if you need a backup copy the folder yourself before starting,  
 * baksmali with APKTool can't handle old .bak files 
 * (it tries putting them in the dex as well).
 * ------------------------------------------------------------------------------- */


if(false === /^win/i.test( require("os").platform() )){ throw new Error("[ERROR] windows only."); }


const  time_start    = Number(new Date())
      ,resolve_path  = function(path){ //a fully qualified path
                         path = path || "";
                         path = path.replace(/\"/g,"").replace(/\\+/g,"/");
                         path = require("path").resolve(path);
                         path = path.replace(/[\/\\]+/g,"/").replace(/\/+$/g,"");
                         return path;
                       }
      ,original_cwd  = resolve_path( process.cwd() )
      ,folders       = process.argv.slice(2)
      ,exec_command  = "dir /b /a-d /s \".\\*.smali\""
      ,exec_options  = {encoding   : "utf8"
                       ,maxBuffer  : Math.pow(1024,3)  //large buffer. default is 1024^2
                       ,timeout    : 3 * 60 * 1000     //3 minutes.
                       }
      ,util          = require("util")
      ,child_process = require("child_process")
      ,exec          = child_process.execSync
      ,fs            = require("fs")
      ,read_options   = {encoding : "utf8"
                        ,signal   : AbortSignal.timeout(10 * 1000) //10 seconds to read (or timeout)
                        }
      ,write_options  = read_options
      ,regexp_content = /(\-\>isconnec.*)($\s*)move-result ([^\s].*)$/igm
      ;


async function edit_file(file){
  file = resolve_path(file);
  let content   = fs.readFileSync(file, read_options);
  const matches = Array.from(content.matchAll(regexp_content));
  
  if(!matches.length){return;}

  //fs.writeFileSync(file + ".bak", read_options); //optional. not advised though! you'll have to delete those files yourself manually before compiling smali to dex (to apk).

  matches.forEach(match=>{
    const  whole_match             = match[0]
          ,method_until_end        = match[1]
          ,whitespace_after_method = match[2]
          ,variable_only           = match[3]
          ;
    
    if(!whole_match || !method_until_end || !whitespace_after_method || !variable_only) return;
    
    const  reconstructed_line = method_until_end 
                              + whitespace_after_method + "####" + "move-result " + variable_only 
                              + whitespace_after_method + "const/4 " + variable_only + ", 0x0"
           ;
    content = content.replace(whole_match, reconstructed_line);
  });

  fs.writeFileSync(file, content, write_options);
  console.log("[INFO] √ " + file);
  
  return new Promise(resolve=>{
               resolve();
             });
}


async function list_files(folder){
  folder = resolve_path(folder);

  const exec_options_for_folder = exec_options;
  exec_options_for_folder.cwd = folder;
  const files = child_process.execSync(exec_command, exec_options_for_folder).replace(/[\r\n]+/gm,"\n").split("\n").filter(file=>(file.length > 3));
  
  console.log("\r\n[INFO] ▼ [" + folder + "]\r\nprocessing [" + String(files.length) + "] files...");
  
  return new Promise((resolve,reject)=>{
               Promise.allSettled( files.map(file=>edit_file(file)) )
                      .then(()=>{
                         resolve();
                       });
             });
}


function done(){
  queueMicrotask(() => {  //delay task. not really needed, just to be safe. https://nodejs.org/api/process.html#when-to-use-queuemicrotask-vs-processnexttick
    const time_diff_seconds  = Math.max(1, Math.round((Number(new Date()) - time_start)/1000));
    console.log("\r\n[INFO] ■ all done [" + String(time_diff_seconds) + " sec.]");
    process.exitCode=0;
    process.exit();
  });
}


console.log("[INFO] processing [" + String(folders.length) + "] folders...");



Promise.allSettled( folders.map(folder=>list_files(folder)) )
       .then(()=>{
          done();
       });


