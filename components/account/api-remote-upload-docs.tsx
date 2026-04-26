"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function CodeBlock({ title, children }: { title: string; children: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <figure className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <figcaption className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </figcaption>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => void onCopy()}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-[min(70vh,520px)] overflow-auto rounded-xl border border-border/80 bg-muted/25 p-4 text-[12px] leading-relaxed text-foreground shadow-inner">
        <code className="whitespace-pre font-mono">{children}</code>
      </pre>
    </figure>
  );
}

export function ApiRemoteUploadDocs({ baseUrl }: { baseUrl: string }) {
  const python = `# pip install requests
import os
import mimetypes
import requests

BASE = "${baseUrl}"
API_KEY = "svk_your_secret_here"
LOCAL_PATH = "file.pdf"
FILENAME = os.path.basename(LOCAL_PATH)
CONTENT_TYPE = mimetypes.guess_type(FILENAME)[0] or "application/octet-stream"

headers = {
    "Authorization": f"Bearer {API_KEY}",
}

def human_size(n):
    units = ["B", "KB", "MB", "GB", "TB"]
    size = float(n)
    i = 0
    while size >= 1024 and i < len(units) - 1:
        size /= 1024
        i += 1
    return f"{size:.1f} {units[i]}" if i > 0 else f"{int(size)} B"

class ProgressFile:
    def __init__(self, path):
        self.file = open(path, "rb")
        self.total = os.path.getsize(path)
        self.sent = 0
        self.last_pct = -1

    def read(self, size=-1):
        chunk = self.file.read(size)
        if not chunk:
            return chunk
        self.sent += len(chunk)
        pct = int((self.sent / self.total) * 100)
        if pct != self.last_pct:
            self.last_pct = pct
            print(f"Uploading... {pct}% ({human_size(self.sent)} / {human_size(self.total)})")
        return chunk

    def __getattr__(self, name):
        return getattr(self.file, name)

pf = ProgressFile(LOCAL_PATH)
try:
    res = requests.post(
        f"{BASE}/api/storage/upload",
        headers=headers,
        files={"file": (FILENAME, pf, CONTENT_TYPE)},
        data={
            "parentId": "",  # optional folder entry id
            "name": FILENAME,  # optional display name override
        },
        timeout=180,
    )
finally:
    pf.close()

res.raise_for_status()
upload_json = res.json()
entry_id = upload_json["entry"]["id"]

share = requests.post(
    f"{BASE}/api/account/entries/{entry_id}/share",
    headers={**headers, "Content-Type": "application/json"},
    json={},
    timeout=30,
)
share.raise_for_status()
share_url = share.json()["url"]

print("Done.")
print(f"Share link: {share_url}")`;

  const javascript = `// npm i axios form-data
import fs from "node:fs";
import path from "node:path";
import { Transform } from "node:stream";
import axios from "axios";
import FormData from "form-data";

const BASE = "${baseUrl}";
const API_KEY = "svk_your_secret_here";
const localPath = "file.pdf";
const filename = path.basename(localPath);
const ext = path.extname(filename).toLowerCase();
const mimeByExt = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".txt": "text/plain",
};
const contentType = mimeByExt[ext] || "application/octet-stream";

const totalBytes = fs.statSync(localPath).size;
let uploaded = 0;

const progressStream = new Transform({
  transform(chunk, _enc, cb) {
    uploaded += chunk.length;
    const pct = ((uploaded / totalBytes) * 100).toFixed(1);
    console.log(\`Uploading... \${pct}% (\${uploaded}/\${totalBytes} bytes)\`);
    cb(null, chunk);
  },
});

const form = new FormData();
const fileStream = fs.createReadStream(localPath).pipe(progressStream);
form.append("file", fileStream, {
  filename,
  contentType,
});
form.append("parentId", ""); // optional folder entry id
form.append("name", filename); // optional display name override

const uploadRes = await axios.post(\`\${BASE}/api/storage/upload\`, form, {
  headers: {
    Authorization: \`Bearer \${API_KEY}\`,
    ...form.getHeaders(),
  },
  maxBodyLength: Infinity,
});
const entryId = uploadRes.data.entry.id;

const shareRes = await axios.post(
  \`\${BASE}/api/account/entries/\${entryId}/share\`,
  {},
  {
    headers: {
      Authorization: \`Bearer \${API_KEY}\`,
      "Content-Type": "application/json",
    },
  },
);

console.log("Done.");
console.log(\`Share link: \${shareRes.data.url}\`);`;

  const csharp = `using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

const string Base = "${baseUrl}";
const string ApiKey = "svk_your_secret_here";
const string LocalPath = "file.pdf";

using var http = new HttpClient();
http.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", ApiKey);

using var form = new MultipartFormDataContent();
var fileInfo = new FileInfo(LocalPath);
var ext = fileInfo.Extension.ToLowerInvariant();
var contentType = ext switch
{
    ".pdf" => "application/pdf",
    ".png" => "image/png",
    ".jpg" or ".jpeg" => "image/jpeg",
    ".txt" => "text/plain",
    _ => "application/octet-stream",
};
var fileStream = File.OpenRead(LocalPath);
var fileContent = new ProgressableStreamContent(
    fileStream,
    fileInfo.Length,
    progress => Console.WriteLine($"Uploading... {progress:P1}")
);
fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
form.Add(fileContent, "file", fileInfo.Name);
form.Add(new StringContent(""), "parentId"); // optional
form.Add(new StringContent(fileInfo.Name), "name"); // optional

using var uploadRes = await http.PostAsync($"{Base}/api/storage/upload", form);
uploadRes.EnsureSuccessStatusCode();
var uploadBody = await uploadRes.Content.ReadAsStringAsync();
using var uploadJson = JsonDocument.Parse(uploadBody);
var entryId = uploadJson.RootElement.GetProperty("entry").GetProperty("id").GetString()
    ?? throw new Exception("Missing entry id");

using var shareReq = new HttpRequestMessage(HttpMethod.Post, $"{Base}/api/account/entries/{entryId}/share")
{
    Content = JsonContent.Create(new { }),
};
shareReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", ApiKey);
using var shareRes = await http.SendAsync(shareReq);
shareRes.EnsureSuccessStatusCode();
using var shareJson = JsonDocument.Parse(await shareRes.Content.ReadAsStringAsync());
var shareUrl = shareJson.RootElement.GetProperty("url").GetString();

Console.WriteLine("Done.");
Console.WriteLine($"Share link: {shareUrl}");

public sealed class ProgressableStreamContent : HttpContent
{
    private const int DefaultBufferSize = 64 * 1024;
    private readonly Stream _stream;
    private readonly long _size;
    private readonly Action<double> _onProgress;

    public ProgressableStreamContent(Stream stream, long size, Action<double> onProgress)
    {
        _stream = stream;
        _size = size;
        _onProgress = onProgress;
    }

    protected override async Task SerializeToStreamAsync(Stream target, TransportContext? context)
    {
        var buffer = new byte[DefaultBufferSize];
        long uploaded = 0;
        int read;
        while ((read = await _stream.ReadAsync(buffer, 0, buffer.Length)) > 0)
        {
            await target.WriteAsync(buffer, 0, read);
            uploaded += read;
            _onProgress(uploaded / (double)_size);
        }
    }

    protected override bool TryComputeLength(out long length)
    {
        length = _size;
        return true;
    }
}`;

  return (
    <div className="mx-auto max-w-3xl space-y-12 pb-20 pt-12 md:space-y-14 md:pt-16">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            HTTP API
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Local file multipart upload
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-[15px]">
            Upload local files directly to Solven using multipart form data.
            This endpoint stores bytes and registers the file entry in one
            request. Use an{" "}
            <Link
              href="/account/profile"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              API key
            </Link>{" "}
            or a normal signed-in browser session (cookie).
          </p>
        </div>
      </div>

      <section className="space-y-3" aria-labelledby="auth-heading">
        <h2 id="auth-heading" className="text-lg font-semibold tracking-tight">
          1) Add your API key
        </h2>
        <p className="text-sm text-muted-foreground">
          Send this header on every request:
        </p>
        <pre className="rounded-xl border border-border/80 bg-muted/25 p-4 font-mono text-[12px] text-foreground">
          Authorization: Bearer svk_…
        </pre>
        <p className="text-xs text-muted-foreground">
          Invalid keys return{" "}
          <code className="font-mono text-foreground">401</code>.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="local-heading">
        <h2 id="local-heading" className="text-lg font-semibold tracking-tight">
          2) Upload a local file
        </h2>
        <p className="text-sm text-muted-foreground">
          Endpoint:{" "}
          <code className="font-mono text-foreground">
            POST /api/storage/upload
          </code>
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>
            <code className="font-mono text-foreground">file</code> — required
            binary file.
          </li>
          <li>
            <code className="font-mono text-foreground">parentId</code> —
            optional folder id; empty or omitted uploads to the root.
          </li>
          <li>
            <code className="font-mono text-foreground">name</code> — optional
            display name override.
          </li>
          <li>
            <code className="font-mono text-foreground">contentType</code> —
            optional mime type override.
          </li>
        </ul>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Success <code className="font-mono text-foreground">200</code> JSON:
        </p>
        <pre className="rounded-xl border border-border/80 bg-muted/25 p-4 font-mono text-[12px] text-foreground">
          {`{
  "entry": { "...": "registered file entry" },
  "key": "users/{userId}/...-file.pdf",
  "size": 12345,
  "contentType": "application/pdf"
}`}
        </pre>
        <p className="text-xs text-muted-foreground">
          Same plan quota checks apply as browser uploads. You get{" "}
          <code className="font-mono">401</code> for bad auth and{" "}
          <code className="font-mono">403</code> with plan codes for quota/plan
          issues.
        </p>
      </section>

      <section className="space-y-6" aria-labelledby="examples-heading">
        <h2
          id="examples-heading"
          className="text-lg font-semibold tracking-tight"
        >
          3) Use one example
        </h2>
        <Tabs defaultValue="python" className="w-full flex-col">
          <TabsList className="w-full justify-start rounded-xl border border-border/80 bg-muted/30 p-1">
            <TabsTrigger
              value="python"
              className="h-8 flex-none rounded-lg border border-transparent px-3 text-xs data-active:border-primary/40 data-active:bg-primary/15 data-active:text-foreground dark:data-active:border-primary/50 dark:data-active:bg-primary/20"
            >
              Python
            </TabsTrigger>
            <TabsTrigger
              value="javascript"
              className="h-8 flex-none rounded-lg border border-transparent px-3 text-xs data-active:border-primary/40 data-active:bg-primary/15 data-active:text-foreground dark:data-active:border-primary/50 dark:data-active:bg-primary/20"
            >
              JavaScript
            </TabsTrigger>
            <TabsTrigger
              value="csharp"
              className="h-8 flex-none rounded-lg border border-transparent px-3 text-xs data-active:border-primary/40 data-active:bg-primary/15 data-active:text-foreground dark:data-active:border-primary/50 dark:data-active:bg-primary/20"
            >
              C#
            </TabsTrigger>
          </TabsList>
          <TabsContent value="python">
            <CodeBlock title="Python (requests)">{python}</CodeBlock>
          </TabsContent>
          <TabsContent value="javascript">
            <CodeBlock title="JavaScript (fetch)">{javascript}</CodeBlock>
          </TabsContent>
          <TabsContent value="csharp">
            <CodeBlock title="C# (.NET, HttpClient)">{csharp}</CodeBlock>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
