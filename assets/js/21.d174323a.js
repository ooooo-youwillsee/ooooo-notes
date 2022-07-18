(window.webpackJsonp=window.webpackJsonp||[]).push([[21],{477:function(t,s,e){t.exports=e.p+"assets/img/03-02.eea6b72f.png"},478:function(t,s,e){t.exports=e.p+"assets/img/03-01.af3c21db.png"},550:function(t,s,e){"use strict";e.r(s);var n=e(33),a=Object(n.a)({},(function(){var t=this,s=t._self._c;return s("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[s("h2",{attrs:{id:"debug-redis-in-window"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#debug-redis-in-window"}},[t._v("#")]),t._v(" debug redis in window")]),t._v(" "),s("h3",{attrs:{id:"_1-install-wsl"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_1-install-wsl"}},[t._v("#")]),t._v(" 1. install wsl")]),t._v(" "),s("p",[t._v("open "),s("strong",[t._v("Microsoft Store")]),t._v(", then search "),s("code",[t._v("ubuntu")]),t._v("  and click to install it.")]),t._v(" "),s("p",[t._v("open terminal")]),t._v(" "),s("div",{staticClass:"language-shell extra-class"},[s("pre",{pre:!0,attrs:{class:"language-shell"}},[s("code",[s("span",{pre:!0,attrs:{class:"token comment"}},[t._v("# list all linux subsystem")]),t._v("\nwsl --list\n"),s("span",{pre:!0,attrs:{class:"token comment"}},[t._v("# set default linux subsystem, then you can input 'wsl' to inter system")]),t._v("\nwsl --set-default ubuntu\n"),s("span",{pre:!0,attrs:{class:"token comment"}},[t._v("# enter default linux subsystem")]),t._v("\nwsl \n"),s("span",{pre:!0,attrs:{class:"token comment"}},[t._v("# install cmake, g++, gcc，gdb")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token builtin class-name"}},[t._v("cd")]),t._v(" /usr/local\n"),s("span",{pre:!0,attrs:{class:"token function"}},[t._v("wget")]),t._v(" https://cmake.org/files/v3.22/cmake-3.22.0-linux-x86_64.tar.gz\n"),s("span",{pre:!0,attrs:{class:"token function"}},[t._v("tar")]),t._v(" xf cmake-3.22.0-linux-x86_64.tar.gz\n"),s("span",{pre:!0,attrs:{class:"token function"}},[t._v("ln")]),t._v(" -s /usr/local/cmake-3.22.0-linux-x86_64/bin/cmake /usr/bin\n"),s("span",{pre:!0,attrs:{class:"token function"}},[t._v("sudo")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token function"}},[t._v("apt")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token function"}},[t._v("install")]),t._v(" build-essential\n")])])]),s("h3",{attrs:{id:"_2-setting-clion"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#_2-setting-clion"}},[t._v("#")]),t._v(" 2. setting clion")]),t._v(" "),s("ol",[s("li",[t._v("open "),s("code",[t._v("File | Settings | Build, Execution, Deployment | Toolchains")]),t._v(" menu.")]),t._v(" "),s("li",[t._v("add "),s("strong",[t._v("new toolchains")]),t._v(" and select "),s("strong",[t._v("wsl")]),t._v(".")])]),t._v(" "),s("p",[s("img",{attrs:{src:e(477),alt:"clion toolchains"}})]),t._v(" "),s("ol",{attrs:{start:"3"}},[s("li",[s("p",[t._v("setting wsl configuration, you maybe install "),s("strong",[t._v("cmake, gcc, g++, gdb")]),t._v(".")])]),t._v(" "),s("li",[s("p",[t._v("you must execute command "),s("code",[t._v("git config --global core.autocrlf input")]),t._v(" in your terminal, because window is CRLF.")])]),t._v(" "),s("li",[s("p",[t._v("select "),s("strong",[t._v("wsl")]),t._v(" in "),s("code",[t._v("File | Settings | Build, Execution, Deployment | Makefile")]),t._v(", because building redis by using\nmakefile.")])]),t._v(" "),s("li",[s("p",[t._v("login wsl and enter redis directory, "),s("code",[t._v("for example: cd /mnt/c/Users/ooooo/Development/code/Demo/redis")])])]),t._v(" "),s("li",[s("p",[t._v("execute command "),s("code",[t._v("make")]),t._v(", you maybe need to execute "),s("code",[t._v("cd src && ls | grep .sh | xargs chmod a+x")])])]),t._v(" "),s("li",[s("p",[s("img",{attrs:{src:e(478),alt:"redis debug"}})])])])])}),[],!1,null,null,null);s.default=a.exports}}]);