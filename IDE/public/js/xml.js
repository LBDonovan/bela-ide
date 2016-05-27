var xml = "/xml/content.xml",
  xmlDoc = $.parseXML( xml ),
  $xml = $( xmlDoc ),
  $title = $xml.find( "section" ),
  $subTitle = $xml.find( "subTitle" ),
  $para = $xml.find( "content" )
  
 
// Append "RSS Title" to #someElement
$( "#content" ).append( "<li><h1>"+$title.text()+"</h1><h2>" +$subTitle[i].text() + "</h2><p>" + $para[i].text() + "</p>");


// function loadXMLDoc() {
//   var xmlhttp = new XMLHttpRequest();
//   xmlhttp.onreadystatechange = function() {
//   //   if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
//   //     myFunction(xmlhttp);
//   //     console.log("myFunction ran!");
//   //   } else {
//   //     console.log("Not state 4 or status 200");
//   //   }
//   // };
//     myFunction(xmlhttp);
//     console.log("past the function");
//   };
//   xmlhttp.open("GET", "/xml/content.xml", true);
//   console.log("XML loaded!");
//   xmlhttp.send();
// }
// function myFunction(xml) {
//   var i;
//   var xmlDoc = xml.responseXML;
//   var content = "";
//   // var table="<tr><th>Artist</th><th>Title</th></tr>";
//   var x = xmlDoc.getElementsByTagName("section");
//   for (i = 0; i <x.length; i++) { 
//     content += "<li><h1>" +
//     x[i].getElementsByTagName("sectionTitle")[0].childNodes[0].nodeValue +
//     "</h1><h2>" +
//     x[i].getElementsByTagName("subTitle")[0].childNodes[0].nodeValue +
//     "</h2><p>" +
//     x[i].getElementsByTagName("content")[0].childNodes[0].nodeValue +
//     "</p></li>";
//   }
//   document.getElementById("docs").innerHTML = content;
// }