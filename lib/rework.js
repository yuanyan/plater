var $ = require('cheerio');
var pinyin = require("pinyin");

function slugify(text) {
    if (typeof text !== 'string') return "";
    text = text.trim().split(/\s/).join('-');
    text = pinyin(text, {
        style: pinyin.STYLE_NORMAL
    });
    return text.join('').toLowerCase().match(/[a-z0-9]+/g).join('-');
}

function addIDs($content) {
    var slugs = ['', '', ''];
    $content.find('h1, h2, h3').each(function() {
        var $el = $(this);
        // In dom it is nodeName or tagName, in cheerio it is name
        var num = parseInt((this.nodeName || this.name)[1]);
        var text = $el.text();
        var slug = slugify(text);
        if (num > 1) slug = slugs[num - 2] + '-' + slug;
        slugs.length = num - 1;
        slugs = slugs.concat([slug, slug]);
        $el.attr('id', slug);
    });
}

module.exports = function ($content){
    addIDs($content);
    return $content;
}
