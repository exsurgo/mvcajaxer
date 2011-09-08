using System.Collections.Generic;

namespace System.Web.Mvc
{
    /// <summary>
    /// Ajax helpers used with the jQuery Updater plugin to update partial html
    /// </summary>
    public static class AjaxHelperExtentions
    {
        public static AjaxUpdate Update(this AjaxHelper helper,
            string id = null,
            string @class = null,
            string tagName = "div",
            string title = null,
            string address = null,
            string navKey = null,
            string allowedTop = null,
            string allowedBottom = null
            )
        {
            return new AjaxUpdate(
                helper, 
                tagName,
                new Dictionary<string, object>
                { 
                    { "id", id },
                    { "class", @class },
                    { "data-update", "content" },
                    { "data-title", title },
                    { "data-address", address },
                    { "data-nav", navKey },
                    { "data-top", allowedTop },
                    { "data-bottom", allowedBottom }
                });
        }

        public static AjaxUpdate Window(this AjaxHelper helper,
            string id = null,
            string @class = null,
            string tagName = "div",
            string title = null,
            bool modal = true,
            int? width = null,
            int? height = null,
            int? maxWidth = null,
            int? maxHeight = null,
            int? minWidth = null,
            int? minHeight = null,
            bool noPadding = false,
            bool allowOverflow = false,
            string icon = null
            )
        {
            return new AjaxUpdate(
                helper, 
                "div",
                new Dictionary<string, object>
                { 
                    { "id", id },
                    { "class", @class },
                    { "data-update", "window" },
                    { "data-title", title },
                    { "data-modal", (modal == false ? new bool?(false) : null) },
                    { "data-width", width },
                    { "data-height", height },
                    { "data-max-width", maxWidth },
                    { "data-max-height", maxHeight },
                    { "data-min-width", minWidth },
                    { "data-min-height", minHeight },
                    { "data-nopad", (noPadding ? new bool?(true) : null) },
                    { "data-overflow", (allowOverflow ? new bool?(true) : null) },
                    { "data-icon", icon }
                });
        }

        public static AjaxUpdate Replace(this AjaxHelper helper,
            string id = null,
            string @class = null,
            string tagName = "div"
            )
        {
            return new AjaxUpdate(
                helper, 
                tagName,
                new Dictionary<string, object>
                { 
                    { "id", id },
                    { "class", @class },
                    { "data-update", "replace" }
                });
        }

        public static AjaxUpdate Insert(this AjaxHelper helper,
            string target,
            string id = null,
            string @class = null,
            string tagName = "div"
            )
        {
            if (string.IsNullOrEmpty(target)) throw new ArgumentException("Target must be provided");
            return new AjaxUpdate(
                helper,
                tagName,
                new Dictionary<string, object>
                { 
                    { "id", id },
                    { "class", @class },
                    { "data-update", "insert" },
                    { "data-target", target }
                });
        }

        public static AjaxUpdate Append(this AjaxHelper helper,
            string target,
            string id = null,
            string @class = null,
            string tagName = "div"
            )
        {
            if (string.IsNullOrEmpty(target)) throw new ArgumentException("Target must be provided");
            return new AjaxUpdate(
                helper, 
                tagName,
                new Dictionary<string, object>
                { 
                    { "id", id },
                    { "class", @class },
                    { "data-update", "append" },
                    { "data-target", target }
                });
        }

        public static AjaxUpdate Prepend(this AjaxHelper helper,
            string target,
            string id = null,
            string @class = null,
            string tagName = "div"
            )
        {
            if (string.IsNullOrEmpty(target)) throw new ArgumentException("Target must be provided");
            return new AjaxUpdate(
                helper, 
                tagName,
                new Dictionary<string, object>
                { 
                    { "id", id },
                    { "class", @class },
                    { "data-update", "prepend" },
                    { "data-target", target }
                });
        }

        public static AjaxUpdate SubRow(this AjaxHelper helper,
            string id = null,
            string @class = null,
            string target = null,
            string tagName = "div"
            )
        {
            return new AjaxUpdate(
                helper, 
                tagName,
                new Dictionary<string, object>
                { 
                    { "id", id },
                    { "class", @class },
                    { "data-update", "subrow" },
                    { "data-target", target }
                });
        }

        public static AjaxUpdate Row(this AjaxHelper helper,
            string id = null,
            string @class = null,
            string target = null,
            string tagName = "tr"
            )
        {
            return new AjaxUpdate(
                helper,
                tagName,
                new Dictionary<string, object>
                { 
                    { "id", id },
                    { "class", @class },
                    { "data-update", "row" },
                    { "data-target", target }
                });
        }

        public static AjaxUpdate Top(this AjaxHelper helper,
            string id = null,
            string @class = null,
            string tagName = "div"
            )
        {
            return new AjaxUpdate(
                helper, 
                tagName,
                new Dictionary<string, object>
                { 
                    { "id", id },
                    { "class", @class },
                    { "data-update", "top" },
                });
        }

        public static AjaxUpdate Bottom(this AjaxHelper helper,
            string id = null,
            string @class = null,
            string tagName = "div"
            )
        {
            return new AjaxUpdate(
                helper, 
                tagName,
                new Dictionary<string, object>
                { 
                    { "id", id },
                    { "class", @class },
                    { "data-update", "bottom" },
                });
        }
    }

    public class AjaxUpdate : IDisposable
    {
        readonly AjaxHelper _helper;
        readonly string _tagName;
        Dictionary<string, object> _attributes;

        public AjaxUpdate(AjaxHelper helper, string tagName, Dictionary<string, object> attributes)
        {
            _helper = helper;
            _tagName = tagName;
            _attributes = attributes;

            //Remove empty or null attributes
            var toRemove = new List<string>();
            foreach (var item in attributes) if (item.Value == null || (item.Value is string && (string)item.Value == "")) toRemove.Add(item.Key);
            foreach (var item in toRemove) attributes.Remove(item);

            //Remove all metadata (data-) if not ajax or is child view
            if (!helper.ViewContext.RequestContext.HttpContext.Request.IsAjaxRequest() || helper.ViewContext.IsChildAction)
            {
                toRemove = new List<string>();
                foreach (var item in attributes) if (item.Key.StartsWith("data-")) toRemove.Add(item.Key);
                foreach (var item in toRemove) attributes.Remove(item);
            }

            //Add isInvalid property if model is invalid
            if (!helper.ViewData.ModelState.IsValid) attributes.Add("data-invalid", true);

            //Open tag
            var tag = new TagBuilder(_tagName);
            foreach (var attr in attributes) tag.MergeAttribute(attr.Key, attr.Value.ToString());
            helper.ViewContext.Writer.Write(tag.ToString(TagRenderMode.StartTag));
        }

        public void Dispose()
        {
            //Close tag
            _helper.ViewContext.Writer.Write("</" + _tagName + ">");
            GC.SuppressFinalize(this);
        }
    }
}