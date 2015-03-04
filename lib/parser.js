var cheerio = require('cheerio');
var marked = require('marked');
var _ = require('lodash');
var highlightjs = require('highlight.js');

var renderer = new marked.Renderer();

marked.setOptions({
    renderer: renderer,
    highlight: function (code) {
        return highlightjs.highlightAuto(code).value;
    },
    gfm: true,
    tables: true,
    breaks: true,
    pedantic: false,
    sanitize: false, // Sanitize the output. Ignore any HTML that has been input.
    smartLists: true,
    smartypants: true
});

module.exports = function(markdown){
    var html = marked(markdown);
    return cheerio.load(html).root()
}
