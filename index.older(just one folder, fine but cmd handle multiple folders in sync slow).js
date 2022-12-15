"use strict";


/* -------------------------------------------------------------------------------
 * DIR (Windows only) all smali files in a folder given as first argument. 
 * parallel read, match pattern, edit (notify in console after file edit).
 * reports when done and exit (exit code always 0).
 * ------------------------------------------------------------------------------- */


if(false === /^win/i.test( require("os").platform() )) throw new Error("[ERROR] windows only. feel free to adjust it for linux with ls or find.")


/*
 _  _       _
| |(_)     | |
| | _  ___ | |_
| || |/ __|| __|
| || |\__ \| |_
|_||_||___/ \__|
*/


const  time_start   = Number(new Date())
      ,resolve_path = function(s){ //a fully qualified path
                        s = s || "";
                        s = s.replace(/\"/g,"").replace(/\\+/g,"/");
                        s = require("path").resolve(s);
                        s = s.replace(/[\/\\]+/g,"/").replace(/\/+$/g,"");
                        return s;
                      }
      ,original_cwd = resolve_path( process.cwd() )
      ,target_path  = resolve_path( process.argv.slice(2,3).pop() || "" )
      ;

process.chdir(target_path);

const  exec_command = "dir /b /a-d /s \".\\*.smali\""
      ,exec_options = {encoding   : "utf8"
                      ,cwd        : target_path
                      ,maxBuffer  : Math.pow(1024,3)  //large buffer. default is 1024^2
                      ,timeout    : 3 * 60 * 1000     //3 minutes.
                      }
      ,paths        = require("child_process").execSync(exec_command,exec_options).replace(/[\r\n]+/gm,"\n").split("\n").filter(line=>(line.length > 3))
      ;

process.chdir(original_cwd);


//--------------------------------------------------------------------------


/*                      _
                       | |
 _ __   ___   __ _   __| |
| '__| / _ \ / _` | / _` |
| |   |  __/| (_| || (_| |
|_|    \___| \__,_| \__,_|
*/


const  fs             = require("fs")
      ,read_options   = {encoding : "utf8"
                        ,signal   : AbortSignal.timeout(10 * 1000) //10 seconds to read (or timeout)
                        }
      ,write_options  = read_options
      ,regexp_content = /(\-\>isconnec.*)($\s*)move-result ([^\s].*)$/igm
      ;


async function read_and_replace(path){
  path          = resolve_path(path);
  let content   = fs.readFileSync(path, read_options);
  const matches = Array.from(content.matchAll(regexp_content));
  
  if(!matches.length){return;}

  //fs.writeFileSync(path + ".bak", read_options); //optional. not advised though! you'll have to delete those files yourself manually before compiling smali to dex (to apk).

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
  

  fs.writeFileSync(path, content, write_options);
  console.log("[INFO] √ " + path);
}


function done(){
  queueMicrotask(() => {  //delay task. not really needed, just to be safe. https://nodejs.org/api/process.html#when-to-use-queuemicrotask-vs-processnexttick
    const time_diff_seconds  = Math.max(1, Math.round((Number(new Date()) - time_start)/1000));
    console.log("[INFO] all done [" + String(time_diff_seconds) + " sec.]");
    process.exitCode=0;
    process.exit();
  });
}


console.log("[INFO] going to process [" + String(paths.length) + "] files...");


Promise.allSettled(
  paths.map(path=>read_and_replace(path))
).then(done);



