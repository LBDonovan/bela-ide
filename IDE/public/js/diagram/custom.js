$(document).ready(function() {
    var mainImage = $('#image')[0];
    var paper = Raphael(mainImage, 300, 482);

    // gimme the image url
    // PUT THE RELEVANT FILE HERE 
    var imageURL = 'belaDiagram/images/bbb_sm.jpg';
    
    // write the image to the Raphael canvas
    paper.image(imageURL, 0, 0, 300, 482);

    var url = 'belaDiagram/json/data.json';
    //console.log('about to do the json');
    $.getJSON(url, function(data){
        for (var i in data){
            for (var k in data[i].things){
                var elem = data[i].things[k];
                var tooltip = "tip";
                var classname = elem.elemclass + " " + "tooltip";
                var rect = paper.rect(elem.x, elem.y, elem.width, elem.height);
                rect.node.setAttribute("class", classname);
                rect.node.id = elem.id;
                $('.tooltip').tooltipster({
                    content: $('<div class="tipText">' + elem.text + '</div>')
                    // putting theme here breaks things
                });
                
            }
        }

        $('rect').mouseenter(function() {
            $(this).css("border", "2px solid red");
        });
        
        $('rect').mouseleave(function() {
            var tempID = "span#z" + $(this).attr('id');
            $(tempID).attr("style", null);
            // eventually: return the corresponding text to its original styles.
        });

    });

}); // end document.ready callback  