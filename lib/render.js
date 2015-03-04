var fs = require('fs');
var path = require('path');
var xtpl = require('xtpl');
var file = require('./file');

function render(fp, target, data){
    xtpl.renderFile(fp, data,
        function(error, contents){
            file.write(target, contents);
    });
}

module.exports = render;
