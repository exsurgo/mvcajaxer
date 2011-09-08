
/*
*   jQuery Updater Plugin - v 0.9.0.68
*   Dependencies: jQuery UI, HashChange plugin
*   
*   Initialize during page load:  
*       $.updater.init(settings);
*
*   Make a request:
*       $.updater.request(url);
*/

$.updater = {


    /**** Settings ****/
    settings: {
        autoEvents: true, //Automatically hijax every link and form
        autoCorrectLinks: true, //Change standard URL's to ajax (#) URL's
        contentId: "content", //The main content area where content is rendered
        topContentId: "content-top", //The content area right above the main content
        bottomContentId: "content-bottom", //The content area right below the main content
        progressId: "progress", //Progress indicator id
        progressText: "One Moment...", //Progress indicator text
        progressCss: "progress", //Progress indicator CSS style
        pageTitlePrefix: "", //Prepend to title of each page
        submitFilter: ".placeholder", //Don't submit any form elements that match this
        subRowCss: "subrow", //CSS class of table subrows
        rowSelectCss: "rowselect", //CSS class of selected rows
        onRequest: function () { }, //A request is made
        onSuccess: function () { }, //A response is received
        onBeforeUpdate: function () { }, //Just before content is updated in the DOM
        onAfterUpdate: function () { }, //Just after content is updated in the DOM
        onComplete: function () { }, //The request and updated have been successfully completed
        onError: function () { } //Request resulted in an error
    },

    /**** Init ****/
    init: function (settings) {

        //Content area
        var content = $("#" + this.settings.contentId);

        //Store base url
        settings.baseUrl = window.location.protocol + "//" + window.location.hostname;

        //Combine default settings with provided
        this.settings = $.extend(this.settings, settings);

        //Add page title prefix
        var title = document.title;
        var prefix = settings.pageTitlePrefix;
        if (prefix && title.slice(0, prefix.length) != prefix) document.title = prefix + document.title;

        //Change standard URL to Ajax URL
        if (this.settings.autoCorrectLinks) {
            var path = location.pathname;
            if (path != "/") {
                content.hide();
                if (path.charAt(0) == "/") path = path.substr(1);
                location.replace("/#" + path + location.search);
            }
        }

        //Handle initial hash value
        if (location.hash.length > 1) {
            content.empty();
            $.updater.request(location.hash.substr(1));
        }

        //Hash change - Back button support
        $(window).hashchange(function () {
            var hash = location.hash.substr(1);
            var address = $(window).data("_updater_address");
            if (address != hash) {
                if (hash == "") hash = "/";
                $.updater.request(hash);
            }
        });

        //Attach events to body
        this.attachEvents("body");

        //Create progress indicator
        $("body").append("<div id=\"" + this.settings.progressId + "\" class=\"" + this.settings.progressCss + "\">" + this.settings.progressText + "</div>");
    },


    /**** Request ****/
    request: function (url, sender, formData) {

        settings = this.settings;
        sender = $(sender);

        //Exit on '#'
        if (url == "#") return;

        //On request event
        settings.onRequest(url, sender, formData);

        //No requests for .7 sec
        var doc = $(document);
        if (doc.data("_updater_hold") != null) return;
        else {
            doc.data("_updater_hold", true);
            setTimeout(new function () { $(document).removeData('_updater_hold'); }, 700);
        }

        //Confirm request
        /*
        *   data-confirm="true"
        *   data-confirm="delete"
        *   data-confirm="Are you sure you want to delete this item?"
        */
        if (sender) {
            var val = sender.attr("data-confirm")
            if (!val) val = sender.find("submit:first").attr("data-confirm");
            if (val) {
                if (val == "true" && !confirm("Are you sure you want to do this?")) return false;
                if (val.indexOf(" ") == -1 && !confirm("Are you sure you want to " + val + "?")) return false;
                if (val.indexOf(" ") > -1 && !confirm(val)) return false;
            }
        }

        //Remove host header & hash
        url = url.replace(/(http|https):\/\/[a-z0-9-_.:]+/i, "").replace(/#/, "");

        //Show Progress
        $.updater.showProgress();

        //Navigation key
        var navKey;

        //Is invalid
        var isInvalid;

        //Begin request
        var method = formData == undefined ? "GET" : "POST";
        var response = $.ajax({

            //Parameters
            type: method,
            url: url,
            data: formData,
            cache: false,

            //Success event
            success: function (result) {

                var content = $("#" + settings.contentId);
                var topContent = $("#" + settings.topContentId);
                var bottomContent = $("#" + settings.bottomContentId);

                //On success event
                settings.onSuccess(result);

                //Close window on post
                if (method == "POST") $(sender).closest(".ui-dialog > div").dialog("destroy");

                //Iterate through updates
                $(result).filter("[data-update]").each(function () {

                    var update = $(this);

                    //Read metadata
                    var meta = update.data();
                    meta.update = meta.update.toLowerCase();
                    if (meta.nav != undefined) navKey = meta.nav;
                    if (meta.isInvalid) isInvalid = true;

                    //Ensure id
                    var id = update.attr("id");
                    if (id == "" || id == undefined) {
                        id = "e" + Math.random();
                        update.attr("id", id);
                    }

                    //Assert IDs
                    if (meta.target) meta.target = $.updater.assertId(meta.target);
                    if (meta.top) meta.top = $.updater.assertId(meta.top);
                    if (meta.bottom) meta.top = $.updater.assertId(meta.top);

                    //On before update
                    settings.onBeforeUpdate(update, meta);

                    //Hide update
                    update.hide();

                    //Make updates
                    switch (meta.update) {

                        // Content                                                                        
                        /*  
                        *   title: string 
                        *   address: string 
                        *   nav: [string|null|false]                                                     
                        *   top: selector 
                        *   bottom: selector        
                        */ 
                        case "content":
                            //Address
                            if (meta.address && meta.address != "") url = meta.address;
                            if (url.charAt(0) == "/") url = url.substr(1);
                            $(window).data("_updater_address", url);
                            if (location.hash.substr(1) != url) {
                                if (url != "/") {
                                    location.hash = url;
                                }
                                else location.hash = "";
                            }
                            //Page Title
                            if (meta.title) document.title = settings.pageTitlePrefix + meta.title;
                            //Top content
                            if (meta.top) topContent.children(":not(" + meta.top + ")").remove();
                            else topContent.empty();
                            //Bottom content
                            if (meta.bottom) bottomContent.children(":not(" + meta.bottom + ")").remove();
                            else bottomContent.empty();
                            //Content
                            content.empty().append(update);
                            id = settings.contentId;
                            break;

                        // Window                                                                                                                                                                                                                
                        /*
                        *   title: string                                                                                                                                                                                     
                        *   modal: bool                                                                                                                                                                                                                           
                        *   width: int                                                                                                                                                                                                                               
                        *   height: int
                        *   maxWidth: int
                        *   maxHeight: int
                        *   minWidth: int
                        *   minHeight: int
                        *   nopad: bool
                        *   overflow: bool
                        *   icon: string
                        */ 
                        case "window":
                            //Show in content area if empty
                            if (content.children().length == 0) content.append(update);
                            //Show window
                            else {
                                //Close existing window
                                $("#" + id).closest(".ui-dialog > div").dialog("destroy").remove();
                                //Window params
                                var params = $.extend(meta,
                                {
                                    modal: meta.modal == false ? false : true,
                                    resizable: false,
                                    width: meta.width ? meta.width : "auto",
                                    height: meta.height ? meta.height : "auto",
                                    open: function () {
                                        var win = $("#" + id).parent(".ui-dialog");
                                        var winTitle = win.find(".ui-dialog-titlebar");
                                        var winContent = win.find(".ui-dialog-content");
                                        //Overflow
                                        if (meta.overflow) win.find(".ui-dialog-content").andSelf().css("overflow", "visible");
                                        //No padding
                                        if (meta.nopad) winContent.css("padding", 0);
                                        //Icon
                                        if (meta.icon) winTitle.find(".ui-dialog-title").prepend("<img src='/Images/" + meta.icon + ".png'/>");
                                        //Recenter on window resize
                                        $(window).bind("resize." + id, function () {
                                            win.position({ at: "center", my: "center", of: window });
                                        });
                                        //Recenter on delay
                                        setTimeout(function () { win.position({ at: "center", my: "center", of: window }); }, 10);
                                    },
                                    close: function () {
                                        //Unbind window resize handler
                                        $(window).unbind("resize." + id);
                                        //Remove window
                                        $(this).remove();
                                    },
                                    drag: function () {
                                        //Unbind window resize handler
                                        $(window).unbind("resize." + id);
                                        //Remove recenter
                                        $(this).parents(".ui-dialog:first");
                                    }
                                });
                                //Show window
                                update.dialog(params);
                            }
                            break;

                        // Table SubRow          
                        /*
                        *   target: selector
                        */ 
                        case "subrow":
                            //Remove old
                            var sub = $("#" + id);
                            if (sub.length) sub.replaceWith(update);
                            else {
                                //Add subrow
                                var tr = meta.target ? $(meta.target) : $(sender).parents("tr:first")
                                if (!tr.next().hasClass(settings.subRowCss)) {
                                    var cols = tr.find("> td").length;
                                    tr.after("<tr class='" + settings.subRowCss + "'><td colspan='" + cols + "'></td></tr>");
                                }
                                //Selected row
                                $("." + settings.rowSelectCss).removeClass(settings.rowSelectCss);
                                $(tr).closest("tr").addClass(settings.rowSelectCss);
                                //Add update
                                var zone = tr.next().find("td:first");
                                zone.prepend(update);
                                //IE8 Rendering Fix
                                if ($.browser.msie && $.browser.version == "8.0") zone.find("table").hide().slideDown(1);
                            }
                            break;

                        // Table Row                                                                                                                                                                                                       
                        /*
                        *   target: selector
                        */ 
                        case "row":
                            //Get self or first table
                            if (!meta.target) meta.target = "#content";
                            var table = $(meta.target).parent().find("table:first");
                            //Add tbody
                            if (!table.find("tbody").length) table.append("<tbody></tbody>");
                            //Add or replace row
                            if (table.find("#" + id).length) table.find("#" + id).replaceWith(update);
                            else table.find("tbody:first").prepend(update);
                            //Select row
                            $("." + settings.rowSelectCss).removeClass(settings.rowSelectCss);
                            var row = table.find("#" + id);
                            row.addClass(settings.rowSelectCss);
                            //Hide empty
                            table.next(".empty:first").hide();
                            break;

                        //Replace                                                                                                                                                                       
                        case "replace":
                            $("#" + id).replaceWith(update);
                            break;

                        // Insert                                                                                                                                                                       
                        /*
                        *   target: selector
                        */ 
                        case "insert":
                            var existing = $(meta.id);
                            if (existing.length) existing.replaceWith(update);
                            else $(meta.target).html(update);
                            break;

                        // Prepend                                                              
                        /*
                        *   target: selector
                        */ 
                        case "prepend":
                            var existing = $(meta.id);
                            if (existing.length) existing.replaceWith(update);
                            else $(meta.target).prepend(update);
                            break;

                        // Append                                                               
                        /*
                        *   target: selector
                        */ 
                        case "append":
                            var existing = $(meta.id);
                            if (existing.length) existing.replaceWith(update);
                            else $(meta.target).append(update);
                            break;

                        //Top                                                                                                                                 
                        case "top":
                            topContent.empty().prepend(update);
                            break;

                        //Bottom                                                                                                                                  
                        case "bottom":
                            bottomContent.empty().prepend(update);
                            break;
                    }

                    //On after update
                    settings.onAfterUpdate(update, meta);

                    //Show update
                    update.show();

                    //Events
                    $.updater.attachEvents(update);

                });

                //Hide progress
                $.updater.hideProgress();

                //Sender success event
                if (!isInvalid) {
                    var e = sender.attr("data-on-success");
                    if (!e) e = sender.find(":submit:first").attr("data-on-success");
                    if (e) (new Function(e)).call(this);
                }

                //Run scripts
                $(result).filter("script").each(function () {
                    $(this).appendTo("body").remove();
                });

                //Re-enable sender
                sender.removeClass("disabled");
                sender.find(":button,:submit,:reset,.button").removeAttr("disabled");

                //On complete
                settings.onComplete(navKey);

            }, //End Success event

            //Error event
            error: function (result) {
                $.updater.hideProgress();
                settings.onError(result);
            }

        }); //End begin request

    },


    /**** Attach Events ****/
    attachEvents: function (context) {

        var settings = $.updater.settings;

        //Dynamic links
        $(settings.autoEvents ? "a:not([href=#],[href^=#],[href^=javascript],[href^=mailto],[data-ajax=false],[data-submit])" : "a:[data-ajax=true]", context).each(function () {
            var link = $(this);
            var url = link.attr("href");
            //Ensure isn't external link
            if (url && url != "" && url[0] != "/" && url.slice(0, settings.baseUrl.length) != settings.baseUrl) {
                //Open all external links in new windows
                link.attr("target", "_blank");
                return;
            }
            //Remove any existing click events
            link.unbind("click");
            //Modify links to include hash
            if (settings.autoCorrectLinks && url != undefined && url[0] == "/") {
                url = "#" + url.substr(1);
                link.attr("href", url);
            }
            //Don't attach event if link opens in new window
            if (link.attr("target") == "_blank") return;
            //Click
            link.click(function (e) {
                e.preventDefault();
                var link = $(this);
                var url = link.attr("href");
                //Modify link
                if (url[0] == "#") url = "/" + url.substr(1);
                //Update details
                var details = link.attr("data-details");
                if (details != undefined && $("#" + details).length) url += (url.indexOf("?") != -1 ? "&" : "?") + "UpdateDetails=True";
                //Get request
                $.updater.request(url, this);
                return false;
            });
        });

        //Dynamic forms
        $(settings.autoEvents ? "form:not([data-ajax=false])" : "form:[data-ajax=true]", context).unbind("submit").submit(function (e) {
            e.preventDefault();
            var form = $(this);
            //Ensure unique ids
            form.attr("id", Math.floor(Math.random() * 11111111));
            //Required for TinyMCE
            if (typeof tinyMCE != "undefined") tinyMCE.triggerSave();
            //Serialize form data, exclude filtered items
            var data = $(this).find(":input").not(settings.submitFilter).serialize();
            //Post request
            $.updater.request(form.attr("action"), this, data);
            return false;
        });

        //Request
        $("[data-request]", context).click(function () { $.updater.request($(this).attr("data-request"), this); });

        //Close
        $("[data-close]", context).click(function () { $.updater.close($(this).attr("data-close"), this); });

        //Submit on dropdown change
        $("select[data-submit=true]", context).change(function () {
            $(this).parent("form:first").submit();
        });

        //Submit on click
        $("[data-submit=true]:not(select)", context).click(function () {
            $(this).parent("form:first").submit();
        });

        //Scroll
        $("[data-scroll=true]", context).each(function () { Scroll(this); });

        //Autoset focus
        var el = $("[data-focus=true]", context);
        if (el.length > 0) setTimeout(function () { el.first().focus() }, 100);
        else setTimeout(function () { $(":input:first", context).focus() }, 100);
    },


    /**** Show Progress ****/
    showProgress: function () {
        var progress = $("#" + $.updater.settings.progressId);
        //Center progress
        progress.show().position({ at: "center", my: "center", of: window });
        //Recenter on window resize
        $(window).bind("resize._progress", function () {
            progress.position({ at: "center", my: "center", of: window });
        });
    },


    /**** Hide Progress ****/
    hideProgress: function () {
        $("#" + $.updater.settings.progressId).hide();
        $(window).unbind("resize._progress");
    },


    /**** Close ****/
    close: function (type, el) {

        var el = $($.updater.assertId(el));
        if (!el.length) return;

        switch (type.toLowerCase()) {

            //Update                                               
            case "update":
                var update = el.closest("[data-update]");
                //Remove
                var subrow = update.closest(".subrow");
                update.remove();
                //Close SubRow if empty
                if (subrow.find("td:first > *:first").length == 0) subrow.remove();
                break;

            //Window                                              
            case "window":
                var win = el.closest(".ui-dialog > div");
                win.dialog("destroy").remove();
                break;

            //Row                                              
            case "row":
                var grid = el.closest(".grid");
                var row;
                if (el.length && el[0].tagName == "TR") row = el;
                else row = el.closest("tr").andSelf.remove();
                //Close
                if (row.next().hasClass("subrow")) row.next().remove();
                row.remove();
                //Re-strip
                grid.find("tr").removeClass("rowalt");
                grid.find("tr:not(.group):not(.subrow):not(:has(th)):odd").addClass("rowalt");
                break;

            //Parent                                             
            case "parent":
                el.parent().remove();
                break;
        }

    },


    /**** Assert id - add # to if type is not known ****/
    assertId: function (selector) {
        if (typeof (selector) == "string") {
            var merge = "";
            var items = selector.split(",");
            $(items).each(function (i) {
                var item = items[i];
                item = $.trim(item);
                if (item.charAt(0) != (".")
                && item.charAt(0) != ("#")
                && item.charAt(0) != ("[")
                && item.charAt(0) != (":"))
                    item = "#" + item;
                merge += item + ",";
            });
            selector = merge.substring(0, merge.length - 1);
        }
        return selector;
    }

};


/*
*   jQuery hashchange event - v1.3 - 7/21/2010
*   http://benalman.com/projects/jquery-hashchange-plugin/
*
*   Copyright (c) 2010 Ben Alman
*   Dual licensed under the MIT and GPL licenses.
*   http://benalman.com/about/license/
*/
(function (j, o, r) { var q = "hashchange", l = document, n, m = j.event.special, k = l.documentMode, p = "on" + q in o && (k === r || k > 7); function s(a) { a = a || location.href; return "#" + a.replace(/^[^#]*#?(.*)$/, "$1") } j.fn[q] = function (a) { return a ? this.bind(q, a) : this.trigger(q) }; j.fn[q].delay = 50; m[q] = j.extend(m[q], { setup: function () { if (p) { return false } j(n.start) }, teardown: function () { if (p) { return false } j(n.stop) } }); n = (function () { var d = {}, e, a = s(), c = function (h) { return h }, b = c, f = c; d.start = function () { e || g() }; d.stop = function () { e && clearTimeout(e); e = r }; function g() { var h = s(), i = f(a); if (h !== a) { b(a = h, i); j(o).trigger(q) } else { if (i !== a) { location.href = location.href.replace(/#.*/, "") + i } } e = setTimeout(g, j.fn[q].delay) } j.browser.msie && !p && (function () { var i, h; d.start = function () { if (!i) { h = j.fn[q].src; h = h && h + s(); i = j('<iframe tabindex="-1" title="empty"/>').hide().one("load", function () { h || b(s()); g() }).attr("src", h || "javascript:0").insertAfter("body")[0].contentWindow; l.onpropertychange = function () { try { if (event.propertyName === "title") { i.document.title = l.title } } catch (t) { } } } }; d.stop = c; f = function () { return s(i.location.href) }; b = function (w, z) { var x = i.document, y = j.fn[q].domain; if (w !== z) { x.title = l.title; x.open(); y && x.write('<script>document.domain="' + y + '"<\/script>'); x.close(); i.location.hash = w } } })(); return d })() })(jQuery, this);