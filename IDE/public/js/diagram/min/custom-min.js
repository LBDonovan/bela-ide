$(document).ready(function(){var t=$("#image")[0],e=Raphael(t,300,482),i="belaDiagram/images/bbb_sm.jpg";e.image(i,0,0,300,482);var o="belaDiagram/json/data.json";console.log("about to do the json"),$.getJSON(o,function(t){for(var i in t)for(var o in t[i].things){var a=t[i].things[o],s="tip",n=a.elemclass+" tooltip",r=e.rect(a.x,a.y,a.width,a.height);r.node.setAttribute("class",n),r.node.id=a.id,$(".tooltip").tooltipster({content:$('<div class="tipText">'+a.text+"</div>")})}$("rect").mouseenter(function(){$(this).css("border","2px solid red")}),$("rect").mouseleave(function(){var t="span#z"+$(this).attr("id");$(t).attr("style",null)})})});