(window.webpackJsonp=window.webpackJsonp||[]).push([[66],{479:function(t,e,n){"use strict";n.r(e);var s=n(25),a=Object(s.a)({},(function(){var t=this,e=t.$createElement,n=t._self._c||e;return n("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[n("h1",{attrs:{id:"logstash"}},[n("a",{staticClass:"header-anchor",attrs:{href:"#logstash"}},[t._v("#")]),t._v(" logstash")]),t._v(" "),n("ol",[n("li",[t._v("install logstash")])]),t._v(" "),n("p",[t._v("refer to "),n("a",{attrs:{href:"https://www.elastic.co/guide/en/logstash/current/index.html",target:"_blank",rel:"noopener noreferrer"}},[t._v("logstash document"),n("OutboundLink")],1)]),t._v(" "),n("ol",{attrs:{start:"2"}},[n("li",[t._v("logstash example config file")])]),t._v(" "),n("div",{staticClass:"language- extra-class"},[n("pre",{pre:!0,attrs:{class:"language-text"}},[n("code",[t._v('input { \n    tcp {\n        port => 12345\n        codec => "json_lines"\n    }\n}\nfilter{\n    grok {\n        match => ["message", "%{TIMESTAMP_ISO8601:logdate}"]\n    }\n\n    date {\n        match => ["logdate", "yyyy-MM-dd HH:mm:ss.SSS"]\n        target => "@timestamp"\n    }\n\n    mutate {  \n        remove_field => ["logdate"]  \n    } \n\n    ruby {   \n        code => "event.set(\'timestamp\', event.get(\'@timestamp\').time.localtime + 8*60*60)"   \n    }  \n\n    ruby {  \n        code => "event.set(\'@timestamp\',event.get(\'timestamp\'))"  \n    } \n\n    mutate {  \n        remove_field => ["timestamp"]  \n    } \n}\noutput {\n  stdout { codec => rubydebug { metadata => true } }\n  file {\n    path => "./logs/%{+YYYY-MM-dd-HH}.log"\n    codec => line { format => "%{message}"}\n  }\n}\n\n')])])]),n("p",[t._v("notes:")]),t._v(" "),n("ol",[n("li",[t._v("it will serve "),n("strong",[t._v("TCP")]),t._v(" connection on "),n("strong",[t._v("localhost:12345")]),t._v(".")]),t._v(" "),n("li",[t._v("uses codec named "),n("code",[t._v("json_lines")]),t._v(", json data format such as "),n("code",[t._v('{ "message" : "xxxx" }')]),t._v(".")]),t._v(" "),n("li",[t._v("matche "),n("strong",[t._v("date")]),t._v(" pattern in the log, then use it as its time.")]),t._v(" "),n("li",[t._v("reset the field "),n("code",[t._v("@timestamp")]),t._v(", output to the local file.")])])])}),[],!1,null,null,null);e.default=a.exports}}]);