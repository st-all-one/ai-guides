# HTTP Advanced Modules

## 1. SSI (Server Side Includes) — ngx_http_ssi_module

### ssi

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| ssi | `ssi on \| off;` | `ssi off;` | `http`, `server`, `location`, `if in location` | Enables SSI command processing in responses. |

### ssi_last_modified

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| ssi_last_modified | `ssi_last_modified on \| off;` | `off` | `http`, `server`, `location` | Preserves `Last-Modified` header during SSI processing (1.5.1). |

### ssi_min_file_chunk

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| ssi_min_file_chunk | `ssi_min_file_chunk size;` | `1024` | `http`, `server`, `location` | Minimum file size for SSI to use sendfile (bytes). |

### ssi_silent_errors

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| ssi_silent_errors | `ssi_silent_errors on \| off;` | `off` | `http`, `server`, `location` | Suppresses SSI error output. |

### ssi_types

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| ssi_types | `ssi_types mime-type ...;` | `text/html` | `http`, `server`, `location` | Enables SSI for additional MIME types. `*` matches all. |

### ssi_value_length

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| ssi_value_length | `ssi_value_length length;` | `256` | `http`, `server`, `location` | Max value length for SSI command parameters. |

**SSI commands supported:** `include`, `echo`, `set`, `if`/`elif`/`else`/`endif`, `block`, `config`.

```nginx
location / {
    ssi on;
    ssi_silent_errors on;
    ssi_types text/html text/xml;
}
```

---

## 2. Charset Conversion — ngx_http_charset_module

### charset

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| charset | `charset charset \| off;` | `off` | `http`, `server`, `location`, `if in location` | Adds charset to `Content-Type` header. Converts if differs from `source_charset`. Can use variable. |

### charset_map

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| charset_map | `charset_map charset1 charset2 { ... }` | — | `http` | Defines conversion table between charsets (hex codes). |

### charset_types

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| charset_types | `charset_types mime-type ...;` | `text/html text/xml text/plain text/vnd.wap.wml application/javascript application/rss+xml` | `http`, `server`, `location` | Enables module for specified MIME types. `*` matches all. |

### override_charset

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| override_charset | `override_charset on \| off;` | `off` | `http`, `server`, `location`, `if in location` | Enables conversion for proxied/FastCGI/etc responses that already have a charset. |

### source_charset

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| source_charset | `source_charset charset;` | — | `http`, `server`, `location`, `if in location` | Defines source charset of response. |

```nginx
charset utf-8;
source_charset koi8-r;
charset_types text/html text/plain;
```

---

## 3. Image Filter — ngx_http_image_filter_module

Requires `--with-http_image_filter_module` and libgd.

### image_filter

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| image_filter | `image_filter off;` | `off` | `location` | Disables processing. |
| | `image_filter test;` | | | Validates image (JPEG/GIF/PNG/WebP). Returns 415 on failure. |
| | `image_filter size;` | | | Outputs JSON: `{"img":{"width":100,"height":100,"type":"gif"}}` |
| | `image_filter rotate 90 \| 180 \| 270;` | | | Rotates counter-clockwise. Variable support. |
| | `image_filter resize width height;` | | | Resizes, preserving aspect ratio. |
| | `image_filter crop width height;` | | | Crops to exact size. |

### image_filter_buffer

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| image_filter_buffer | `image_filter_buffer size;` | `1M` | `http`, `server`, `location` | Max image size for processing. |

### image_filter_interlace

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| image_filter_interlace | `image_filter_interlace on \| off;` | `off` | `http`, `server`, `location` | Enables progressive/interlace JPEG and PNG (1.11.6). |

### image_filter_jpeg_quality

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| image_filter_jpeg_quality | `image_filter_jpeg_quality percent;` | `75` | `http`, `server`, `location` | JPEG quality (1-100). Variable support. |

### image_filter_sharpen

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| image_filter_sharpen | `image_filter_sharpen percent;` | `0` | `http`, `server`, `location` | Sharpens image. Variable support. |

### image_filter_transparency

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| image_filter_transparency | `image_filter_transparency on \| off;` | `on` | `http`, `server`, `location` | Preserves transparency for GIF and PNG. |

### image_filter_webp_quality

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| image_filter_webp_quality | `image_filter_webp_quality percent;` | `80` | `http`, `server`, `location` | WebP quality (1.11.6). Variable support. |

```nginx
location /img/ {
    image_filter resize 200 200;
    image_filter_jpeg_quality 85;
    image_filter_buffer 2M;
    proxy_pass http://backend;
}
```

---

## 4. XSLT Transformation — ngx_http_xslt_module

Requires `--with-http_xslt_module`, libxml2, libxslt.

### xml_entities

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| xml_entities | `xml_entities path;` | — | `http`, `server`, `location` | DTD file declaring character entities. |

### xml_external_entities

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| xml_external_entities | `xml_external_entities on \| off;` | `off` | `http`, `server`, `location` | Enables external entity processing (1.29.3). |

### xslt_last_modified

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| xslt_last_modified | `xslt_last_modified on \| off;` | `off` | `http`, `server`, `location` | Preserves `Last-Modified` header (1.5.1). |

### xslt_param

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| xslt_param | `xslt_param parameter value;` | — | `http`, `server`, `location` | Defines XSLT parameters (1.27.4). |

### xslt_string_param

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| xslt_string_param | `xslt_string_param parameter value;` | — | `http`, `server`, `location` | Defines XSLT string parameters (1.27.4). |

### xslt_stylesheet

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| xslt_stylesheet | `xslt_stylesheet path [param=value ...];` | — | `http`, `server`, `location` | Specifies XSLT stylesheet with optional parameters. |

### xslt_types

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| xslt_types | `xslt_types mime-type ...;` | `text/xml` | `http`, `server`, `location` | Enables XSLT for specified MIME types. `*` matches all. |

```nginx
location /xml/ {
    xslt_stylesheet /path/to/transform.xslt title='$arg_title';
    xslt_types text/xml application/xml;
}
```

---

## 5. WebDAV — ngx_http_dav_module

Requires `--with-http_dav_module`. Supports PUT, DELETE, MKCOL, COPY, MOVE.

### create_full_put_path

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| create_full_put_path | `create_full_put_path on \| off;` | `off` | `http`, `server`, `location` | Creates all needed intermediate directories on PUT. |

### dav_access

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| dav_access | `dav_access users:permissions ...;` | `user:rw` | `http`, `server`, `location` | Sets access permissions for created files/directories. |

### dav_methods

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| dav_methods | `dav_methods [PUT] [DELETE] [MKCOL] [COPY] [MOVE];` | — | `http`, `server`, `location` | Enables specified WebDAV methods. `off` disables. |

### min_delete_depth

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| min_delete_depth | `min_delete_depth number;` | `0` | `http`, `server`, `location` | Minimum depth for DELETE (must be >= path depth). |

```nginx
location /dav/ {
    dav_methods PUT DELETE MKCOL COPY MOVE;
    create_full_put_path on;
    dav_access group:rw all:r;
}
```

---

## 6. Autoindex — ngx_http_autoindex_module

### autoindex

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| autoindex | `autoindex on \| off;` | `off` | `http`, `server`, `location` | Enables directory listing. |

### autoindex_exact_size

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| autoindex_exact_size | `autoindex_exact_size on \| off;` | `on` | `http`, `server`, `location` | Exact bytes vs human-readable sizes. |

### autoindex_format

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| autoindex_format | `autoindex_format html \| xml \| json \| jsonp;` | `html` | `http`, `server`, `location` | Directory listing format. |

### autoindex_localtime

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| autoindex_localtime | `autoindex_localtime on \| off;` | `off` | `http`, `server`, `location` | Uses local time vs UTC in listing. |

```nginx
location /files/ {
    autoindex on;
    autoindex_format json;
    autoindex_exact_size off;
    autoindex_localtime on;
}
```

---

## 7. Index — ngx_http_index_module

### index

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| index | `index file ...;` | `index index.html;` | `http`, `server`, `location` | Defines index files. Last parameter can be a URI. Internal redirect. |

```nginx
location / {
    index index.php index.html index.htm;
}
```

---

## 8. Random Index — ngx_http_random_index_module

Requires `--with-http_random_index_module`.

### random_index

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| random_index | `random_index on \| off;` | `off` | `location` | Selects a random file from directory as index. |

```nginx
location / {
    random_index on;
}
```

---

## 9. Empty GIF — ngx_http_empty_gif_module

### empty_gif

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| empty_gif | `empty_gif;` | — | `location` | Returns a 1x1 transparent GIF. Built by default. |

```nginx
location = /empty.gif {
    empty_gif;
}
```

---

## 10. FLV — ngx_http_flv_module

### flv

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| flv | `flv;` | — | `location` | Serves FLV files with pseudo-streaming support (seek using `start` argument). |

```nginx
location ~ \.flv$ {
    flv;
}
```

---

## 11. MP4 — ngx_http_mp4_module

Requires `--with-http_mp4_module`.

### mp4

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| mp4 | `mp4;` | — | `location` | Serves MP4 files with seeking support via `start` and `end` arguments. |

### mp4_buffer_size

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| mp4_buffer_size | `mp4_buffer_size size;` | `512K` | `http`, `server`, `location` | Buffer size for MP4 processing. |

### mp4_max_buffer_size

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| mp4_max_buffer_size | `mp4_max_buffer_size size;` | `10M` | `http`, `server`, `location` | Max buffer size for MP4 processing. |

### mp4_limit_rate

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| mp4_limit_rate | `mp4_limit_rate on \| off \| factor;` | `off` | `http`, `server`, `location` | Limits rate based on requested bitrate. |

### mp4_limit_rate_after

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| mp4_limit_rate_after | `mp4_limit_rate_after time;` | `60s` | `http`, `server`, `location` | Enables rate limiting after specified time. |

### mp4_start_key_frame

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| mp4_start_key_frame | `mp4_start_key_frame on \| off;` | `off` | `http`, `server`, `location` | Seeks to nearest keyframe before `start` point. |

```nginx
location ~ \.mp4$ {
    mp4;
    mp4_buffer_size 1M;
    mp4_max_buffer_size 5M;
    mp4_limit_rate on;
    mp4_start_key_frame on;
}
```

---

## 12. HLS — ngx_http_hls_module

Requires `--with-http_hls_module`.

### hls

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| hls | `hls;` | — | `location` | Serves HLS (HTTP Live Streaming) media from MP4/M4A files. |

### hls_buffers

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| hls_buffers | `hls_buffers number size;` | `8 2m` or `16 1m` | `http`, `server`, `location` | Buffer count and size for HLS. |

### hls_forward_args

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| hls_forward_args | `hls_forward_args on \| off;` | `off` | `http`, `server`, `location` | Forwards arguments to playlist and fragment URIs (1.5.12). |

### hls_fragment

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| hls_fragment | `hls_fragment time;` | `5s` | `http`, `server`, `location` | Max fragment duration. |

### hls_mp4_buffer_size

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| hls_mp4_buffer_size | `hls_mp4_buffer_size size;` | `512K` | `http`, `server`, `location` | Buffer size for MP4 input. |

### hls_mp4_max_buffer_size

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| hls_mp4_max_buffer_size | `hls_mp4_max_buffer_size size;` | `10M` | `http`, `server`, `location` | Max buffer size for MP4 input. |

```nginx
location /hls/ {
    hls;
    hls_fragment 10s;
    hls_buffers 16 1m;
    alias /var/media/;
}
```

---

## 13. F4F — ngx_http_f4f_module

Requires `--with-http_f4f_module`. Serves Adobe HDS (F4F) fragments.

### f4f

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| f4f | `f4f;` | — | `location` | Enables F4F streaming. |

### f4f_buffer_size

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| f4f_buffer_size | `f4f_buffer_size size;` | `512K` | `http`, `server`, `location` | Buffer size for F4F index file. |

---

## 14. Mirror — ngx_http_mirror_module

### mirror

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| mirror | `mirror uri \| off;` | `off` | `http`, `server`, `location` | Creates a background mirror subrequest to specified URI (1.13.4). |

### mirror_request_body

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| mirror_request_body | `mirror_request_body on \| off;` | `on` | `http`, `server`, `location` | Enables passing request body to mirror subrequest. |

```nginx
location / {
    mirror /mirror;
    proxy_pass http://backend;
}

location = /mirror {
    internal;
    proxy_pass http://mirror-backend$request_uri;
}
```

---

## 15. Key-Value — ngx_http_keyval_module

### keyval_zone

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| keyval_zone | `keyval_zone zone=name:size [state=file] [sync];` | — | `http` | Defines shared key-value database zone. |

### keyval

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| keyval | `keyval key $variable zone=name;` | — | `http` | Sets variable by looking up key value in keyval zone. |

### keyval_no_expiry

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| keyval_no_expiry | `keyval_no_expiry on \| off;` | `off` | `http` | Disables key expiry (1.29.5). |

```nginx
keyval_zone zone=api_keys:1m state=/var/lib/nginx/state/api_keys.state;
keyval $http_x_api_key $client_id zone=api_keys;
```

---

## 16. nJS — ngx_http_js_module

Requires `--add-module` for njs scripting. Full njs documentation is separate.

### js_import

| Name | Syntax | Default | Context |
|------|--------|---------|---------|
| js_import | `js_import path [export=name];` | — | `http` |

### js_path

| Name | Syntax | Default | Context |
|------|--------|---------|---------|
| js_path | `js_path path;` | — | `http` |

### js_var

| Name | Syntax | Default | Context |
|------|--------|---------|---------|
| js_var | `js_var $variable value;` | — | `http`, `server`, `location` |

### js_set

| Name | Syntax | Default | Context |
|------|--------|---------|---------|
| js_set | `js_set $variable function;` | — | `http`, `server`, `location` |

### js_body_filter

| Name | Syntax | Default | Context |
|------|--------|---------|---------|
| js_body_filter | `js_body_filter function [buffer_type=string\|buffer];` | — | `http`, `server`, `location` |

### js_header_filter

| Name | Syntax | Default | Context |
|------|--------|---------|---------|
| js_header_filter | `js_header_filter function;` | — | `http`, `server`, `location` |

### js_content

| Name | Syntax | Default | Context |
|------|--------|---------|---------|
| js_content | `js_content function;` | — | `location` |

### js_preload_object

| Name | Syntax | Default | Context |
|------|--------|---------|---------|
| js_preload_object | `js_preload_object name [file=path] [string=value] [fetch=uri];` | — | `http` |

---

## 17. Perl — ngx_http_perl_module

Requires `--with-http_perl_module`.

### perl

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| perl | `perl module::function \| 'sub { ... }';` | — | `location`, `if in location` | Calls Perl function for request processing. |

### perl_modules

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| perl_modules | `perl_modules path;` | — | `http` | Sets Perl module search path. |

### perl_require

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| perl_require | `perl_require module;` | — | `http` | Loads Perl module at config time. |

```nginx
location / {
    perl MyApp::handler;
}
```

---

## 18. Internal Redirect — ngx_http_internal_redirect_module

### internal_redirect

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| internal_redirect | `internal_redirect;` | — | `location` | Enables internal redirect processing for responses containing `X-Internal-Redirect` header (Plus, 1.29.0). |

### internal_redirect_min_length / internal_redirect_max_length

| Name | Syntax | Default | Context |
|------|--------|---------|---------|
| internal_redirect_min_length | `internal_redirect_min_length length;` | `1` | `http`, `server`, `location` |
| internal_redirect_max_length | `internal_redirect_max_length length;` | `1024` | `http`, `server`, `location` |

### internal_redirect_recursion_limit

| Name | Syntax | Default | Context |
|------|--------|---------|---------|
| internal_redirect_recursion_limit | `internal_redirect_recursion_limit number;` | `10` | `http`, `server`, `location` |

---

## 19. Number Map — ngx_http_num_map_module

### num_map

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| num_map | `num_map $input $output { ... }` | — | `http` | Maps numeric input to output using range-based rules (Plus, 1.29.5). |

```nginx
num_map $arg_id $value {
    default    0;
    1-10       100;
    11-100     200;
    101-1000   300;
}
```

---

## 20. Session Log — ngx_http_session_log_module (Plus)

### session_log_zone

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| session_log_zone | `session_log_zone path=path format=format zone=name:size [md5=key] [min_uses=number] [timeout=time];` | — | `http` | Defines session log zone for grouping requests into sessions. |

### session_log

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| session_log | `session_log name \| off;` | `off` | `http`, `server`, `location` | Enables session logging with named zone. |

---

## 21. Proxy Protocol Vendor — ngx_http_proxy_protocol_vendor_module

### proxy_protocol_vendor

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| proxy_protocol_vendor | `proxy_protocol_vendor name $variable;` | — | `http`, `server`, `location` | Extracts vendor-specific TLVs from PROXY protocol header (Plus, 1.29.3). |

---

## 22. Gzip — ngx_http_gzip_module

### gzip

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| gzip | `gzip on \| off;` | `off` | `http`, `server`, `location`, `if in location` | Enables gzip compression. |

### gzip_buffers

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| gzip_buffers | `gzip_buffers number size;` | `32 4k\|16 8k` | `http`, `server`, `location` | Buffer count and size for gzip. |

### gzip_comp_level

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| gzip_comp_level | `gzip_comp_level level;` | `1` | `http`, `server`, `location` | Compression level (1-9). |

### gzip_disable

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| gzip_disable | `gzip_disable regex ...;` | — | `http`, `server`, `location` | Disables gzip for User-Agent matching regex. Special value `msie6`. |

### gzip_hash

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| gzip_hash | `gzip_hash buckets;` | `4` | `http`, `server`, `location` | Hash table bucket size for gzip. |

### gzip_http_version

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| gzip_http_version | `gzip_http_version 1.0 \| 1.1;` | `1.1` | `http`, `server`, `location` | Min HTTP version for gzip. |

### gzip_min_length

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| gzip_min_length | `gzip_min_length length;` | `20` | `http`, `server`, `location` | Min response length to compress. |

### gzip_proxied

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| gzip_proxied | `gzip_proxied off \| expired \| no-cache \| no-store \| private \| no_last_modified \| no_etag \| auth \| any ...;` | `off` | `http`, `server`, `location` | Gzip compression for proxied requests based on cache headers. |

### gzip_types

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| gzip_types | `gzip_types mime-type ...;` | `text/html` | `http`, `server`, `location` | MIME types to compress. `*` matches all. |

### gzip_vary

| Name | Syntax | Default | Context | Description |
|------|--------|---------|---------|-------------|
| gzip_vary | `gzip_vary on \| off;` | `off` | `http`, `server`, `location` | Adds `Vary: Accept-Encoding` header. |

```nginx
gzip on;
gzip_comp_level 5;
gzip_min_length 256;
gzip_proxied any;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
gzip_vary on;
gzip_disable "msie6";
```
