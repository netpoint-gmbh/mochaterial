importScripts('https://unpkg.com/diff@4.0.1/dist/diff.min.js', 'https://unpkg.com/diff2html@2.7.0/dist/diff2html.min.js');

onmessage = function(event) {
    let diffHtml;
    if (event.data.actual == event.data.expected) {
        diffHtml = `<div class="diff-identical">Actual and Expected values match, both contain:\n    ${event.data.actual}</div>`
    } else {
        diffHtml = self.Diff2Html.getPrettyHtml(
            self.Diff.createPatch('string', event.data.actual, event.data.expected),
            {inputFormat: 'diff', showFiles: false, matching: 'words', outputFormat: event.data.diffFormat,
            rawTemplates
            }
        );
    }
    postMessage({elementId: event.data.elementId, language: event.data.language, content: diffHtml});
}

const rawTemplates = {
    'side-by-side-file-diff': 
`<div class="d2h-side-by-side d2h-left scrollbar">
    <table class="d2h-diff-table">
        <tbody class="d2h-diff-tbody">{{{diffs.left}}}</tbody>
    </table>
</div>
<div class="d2h-side-by-side d2h-right scrollbar">
    <table class="d2h-diff-table">
        <tbody class="d2h-diff-tbody">{{{diffs.right}}}</tbody>
    </table>
</div>`,
    'line-by-line-file-diff' :
`<div class="d2h-line-by-line">
    <table class="d2h-diff-table">
      <tbody class="d2h-diff-tbody">{{{diffs}}}</tbody>
    </table>
</div>`,
    'generic-line':
`<tr class="{{type}}">
    <td class="{{lineClass}}">{{{lineNumber}}}</td>
    <td class="{{type}}">
        <div class="{{contentClass}} {{type}}">{{#prefix}}<span class="d2h-code-line-prefix">{{{prefix}}}</span>{{/prefix}}{{#content}}<span class="d2h-code-line-ctn">{{{content}}}</span>{{/content}}</div>
    </td>
</tr>`
}