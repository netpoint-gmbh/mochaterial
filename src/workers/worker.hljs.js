importScripts('./highlight.pack.js');

onmessage = function(event) {
  var result = self.hljs.highlight(event.data.language, event.data.content, false);
  postMessage({elementId: event.data.elementId, language: event.data.language, content: result.value});
}