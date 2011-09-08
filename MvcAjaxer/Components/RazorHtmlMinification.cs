using System;
using System.Linq;
using System.Text;
using System.Web.Razor;
using System.Web.Mvc.Razor;
using System.Web.Razor.Generator;
using System.Web.Razor.Parser.SyntaxTree;
using System.Web.WebPages.Razor;

namespace System.Web.Mvc.Razor
{
    /// <summary>
    /// Performs the HTML minification at compile time.
    /// </summary>
    public sealed class MinifyHtmlCodeGenerator : MvcCSharpRazorCodeGenerator
    {
        public MinifyHtmlCodeGenerator(string className, string rootNamespaceName, string sourceFileName, RazorEngineHost host)
            : base(className, rootNamespaceName, sourceFileName, host)
        {
        }

        public override void VisitSpan(Span span)
        {
            // We only minify the static text
            var markupSpan = span as MarkupSpan;
            if (markupSpan == null)
            {
                base.VisitSpan(span);
                return;
            }

            var content = markupSpan.Content;

            content = Minify(content);

            span.Content = content;
            base.VisitSpan(span);
        }

        private static char[] _whiteSpaceSepartors = new char[] { '\n', '\r' };
        private static string[] _commentsMarkers = new string[] { "{", "}", "function", "var", "[if" };

        private string Minify(string content)
        {
            if (string.IsNullOrWhiteSpace(content))
            {
                return string.Empty;
            }

            var builder = new StringBuilder(content.Length);

            // Minify the comments
            var icommentstart = content.IndexOf("<!--");
            while (icommentstart >= 0)
            {
                var icommentend = content.IndexOf("-->", icommentstart + 3);
                if (icommentend < 0)
                {
                    break;
                }

                if (_commentsMarkers.Select(m => content.IndexOf(m, icommentstart)).Any(i => i > 0 && i < icommentend))
                {
                    // There is a comment but it contains javascript or IE conditionals
                    // => we keep it
                    break;
                }

                builder.Append(content, 0, icommentstart);
                builder.Append(content, icommentend + 3, content.Length - icommentend - 3);
                content = builder.ToString();
                builder.Clear();

                icommentstart = content.IndexOf("<!--", icommentstart);
            }

            // Minify white space while keeping the HTML compatible with the given one
            var lines = content.Split(_whiteSpaceSepartors, StringSplitOptions.RemoveEmptyEntries);
            for (int i = 0; i < lines.Length; i++)
            {
                var line = lines[i];
                var trimmedLine = line.Trim();
                if (trimmedLine.Length == 0)
                {
                    continue;
                }
                if (char.IsWhiteSpace(line[0]) && (trimmedLine[0] != '<'))
                {
                    builder.Append(' ');
                }
                builder.Append(trimmedLine);
                if (char.IsWhiteSpace(line[line.Length - 1]) && (trimmedLine[trimmedLine.Length - 1] != '>'))
                {
                    builder.Append(' ');
                }
            }

            //Additional replacements
            var result = builder.ToString();
            result = result
                .Replace(" />", "/>")
                .Replace("</ ", "</")
                .Replace(" id=\"\"", "")
                .Replace(" class=\"\"", "")
                .Replace(" title=\"\"", "")
                .Replace(" style=\"\"", "");

            return result;
        }
    }

    /// <summary>
    /// Decorates the Razor code generator.
    /// </summary>
    public sealed class MinifyHtmlMvcWebPageRazorHost : MvcWebPageRazorHost
    {
        public MinifyHtmlMvcWebPageRazorHost(string virtualPath, string physicalPath)
            : base(virtualPath, physicalPath)
        {
        }

        public override RazorCodeGenerator DecorateCodeGenerator(RazorCodeGenerator incomingCodeGenerator)
        {
            if (incomingCodeGenerator is CSharpRazorCodeGenerator)
            {
                return new MinifyHtmlCodeGenerator(incomingCodeGenerator.ClassName, incomingCodeGenerator.RootNamespaceName, incomingCodeGenerator.SourceFileName, incomingCodeGenerator.Host);
            }
            return base.DecorateCodeGenerator(incomingCodeGenerator);
        }
    }

    /// <summary>
    /// Removes useless whitespace and comments in an HTML page.
    /// It is executed when Razor generate the code for a page, just before the compilation.
    /// There is a small performance penalty when the page compiles and a small optimization at execution.
    /// </summary>
    public sealed class MinifyHtmlWebRazorHostFactory : WebRazorHostFactory
    {
        public override WebPageRazorHost CreateHost(string virtualPath, string physicalPath)
        {
            WebPageRazorHost host = base.CreateHost(virtualPath, physicalPath);
            if (host.IsSpecialPage)
            {
                return host;
            }
            return new MinifyHtmlMvcWebPageRazorHost(virtualPath, physicalPath);
        }
    }
}


