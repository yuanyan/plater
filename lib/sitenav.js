var parser = require('./parser');
var $ = require('cheerio');
var path = require('path');

module.exports = function(navContent, markdownPath){
    var $siteNav = parser(navContent);
    var $navbar = $siteNav.children().first();
    // TODO custom site nav class
    $navbar.addClass('nav navbar-nav');

    var $menu = $navbar.find('ul');
    $menu.addClass('dropdown-menu');

    var markdownFiles = [];
    $siteNav.find('a').each(function(){
        var $el = $(this);
        var href = $el.attr('href') || '';

        // link must be relative current page path
        if(markdownPath){
            var absoluteHref = path.resolve(href);
            markdownPath = path.resolve(markdownPath);
            // add active class to highlight current
            if(absoluteHref == markdownPath){
                $el.parents('li').addClass('active');
            }

            href = path.relative(path.dirname(markdownPath), absoluteHref) || '.';
        }

        markdownFiles.push(href);
        $el.attr('href', href.replace(/README\.md/i, 'index.html').replace(/\.md/i, '.html'));
    });

    return {
        siteNavHtml: $siteNav.html(),
        markdownFiles: markdownFiles
    };
}
