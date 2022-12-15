a Windows only, less generic but a lot faster implementation of my previous `smali_offliner`,  
basically `DIR` does the enumeration and file reading (and pattern-matching and editing) is parallel.  
console logs are limited to just the few files matching (instead of all of them).

<hr/>

<a href="https://paypal.me/%65%31%61%64%6B%61%72%61%6B%30/%35%55%53%44" title="show your support">♥</a>  

<br/>

<hr/>

usage:  

- `node.exe index.js "folder"`  
- or `index.cmd "folder1" "folder2" "folder3" ....`  (folders handling is done one after the other).  

the NodeJS script can handle one folder,  
the batch file can handle any amount of folders (usually Windows limited the arguments to about 30),  
which it processes one by one