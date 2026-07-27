# NGINX Module Development Guide

## Code Organization and Directory Structure

### Source Tree

```
nginx/
├── auto/              # Build system (make, configure)
│   ├── cc/            # Compiler detection
│   ├── lib/           # Library detection
│   ├── modules/       # Module enable/disable
│   ├── types/         # Type size checks
│   ├── define         # Platform detection
│   ├── feature        # Feature detection
│   ├── have           # Have macro
│   ├── have_headers   # Header availability
│   ├── headers        # Platform-specific headers
│   ├── init           # Initialization
│   ├── install        # Install paths
│   ├── make           # Makefile generation
│   ├── options        # Configure options
│   ├── os/            # OS-specific (conf, features, sources)
│   ├── sources        # Source file lists
│   ├── summary        # Build summary
│   └── threads        # Thread support
│
├── src/
│   ├── core/          # Core infrastructure
│   ├── event/         # Event processing
│   │   └── modules/   # Event modules (epoll, kqueue, etc.)
│   ├── http/          # HTTP module
│   │   └── modules/   # HTTP modules
│   ├── mail/          # Mail proxy module
│   ├── stream/        # TCP/UDP stream module
│   ├── misc/          # Miscellaneous
│   └── os/            # OS-specific (unix, win32)
│       └── unix/
│       └── win32/
│
├── conf/              # Sample configs
├── contrib/           # Contrib tools (vim syntax, geo2nginx)
├── docs/              # Documentation
└── man/               # Man pages
```

### Module Location

Third-party modules go in their own directory. Each module typically has:
- `config` file for the build system
- Source files (`.c`, `.h`)

## Build System

### Configuration

```
./configure --with-http_ssl_module --add-module=/path/to/module
./configure --add-dynamic-module=/path/to/module  # Dynamic module
```

### Config File (for modules)

The `config` file in a module directory tells the build system what to compile:

```
ngx_addon_name=ngx_http_my_module
HTTP_MODULES="$HTTP_MODULES ngx_http_my_module"
NGX_ADDON_SRCS="$NGX_ADDON_SRCS $ngx_addon_dir/ngx_http_my_module.c"
```

For dynamic modules:
```
ngx_addon_name=ngx_http_my_module
HTTP_FILTER_MODULES="$HTTP_FILTER_MODULES ngx_http_my_module"
NGX_ADDON_SRCS="$NGX_ADDON_SRCS $ngx_addon_dir/ngx_http_my_module.c"
```

## Include Files

### Core Headers

```c
#include <ngx_config.h>
#include <ngx_core.h>
#include <ngx_http.h>
```

### Core Header Files

| File | Purpose |
|------|---------|
| `ngx_core.h` | Core definitions, types, macros |
| `ngx_log.h` | Logging |
| `ngx_palloc.h` | Memory pool allocation |
| `ngx_array.h` | Dynamic arrays |
| `ngx_list.h` | Linked lists |
| `ngx_queue.h` | Queue data structure |
| `ngx_rbtree.h` | Red-black trees |
| `ngx_radix_tree.h` | Radix trees |
| `ngx_hash.h` | Hash tables |
| `ngx_string.h` | String utilities |
| `ngx_times.h` | Time caching |
| `ngx_connection.h` | Connection handling |
| `ngx_buf.h` | Buffer management |
| `ngx_chain.h` | Buffer chains |
| `ngx_resolver.h` | DNS resolver |
| `ngx_event.h` | Event loop |
| `ngx_process.h` | Process management |
| `ngx_process_cycle.h` | Process lifecycle |
| `ngx_conf_file.h` | Configuration parsing |
| `ngx_module.h` | Module structure |

### HTTP Headers

```c
#include <ngx_http.h>
```

| File | Purpose |
|------|---------|
| `ngx_http_core_module.h` | Core HTTP structures |
| `ngx_http_request.h` | Request structure |
| `ngx_http_config.h` | Config directives |
| `ngx_http_variables.h` | Variable system |
| `ngx_http_upstream.h` | Upstream framework |
| `ngx_http_busy_lock.h` | Busy lock |

## Integer Types

| Type | Size | Description |
|------|------|-------------|
| `ngx_int_t` | platform pointer | Signed integer (intptr_t) |
| `ngx_uint_t` | platform pointer | Unsigned integer (uintptr_t) |
| `ngx_flag_t` | platform pointer | Signed flag (-1, 0, non-zero) |
| `ngx_msec_t` | 64-bit | Milliseconds (`ngx_msec_t`) |
| `ngx_msec_int_t` | 64-bit | Signed milliseconds |

### Definitions

```c
#define NGX_OK          0
#define NGX_ERROR       -1
#define NGX_AGAIN       -2
#define NGX_BUSY        -3
#define NGX_DONE        -4
#define NGX_DECLINED    -5
#define NGX_ABORT       -6
```

## String Types

### ngx_str_t

```c
typedef struct {
    size_t      len;
    u_char     *data;
} ngx_str_t;
```

Usage: `len` is length (not including null terminator), `data` may NOT be null-terminated.

### ngx_keyval_t

```c
typedef struct {
    ngx_str_t  key;
    ngx_str_t  value;
} ngx_keyval_t;
```

### ngx_buf_t (Buffer)

```c
typedef struct ngx_buf_s {
    u_char          *pos;       /* Current read position */
    u_char          *last;      /* Current write position */
    off_t            file_pos;  /* File read position */
    off_t            file_last; /* File write position */
    u_char          *start;     /* Buffer start */
    u_char          *end;       /* Buffer end */
    ngx_buf_tag_t    tag;       /* Buffer tag */
    ngx_file_t      *file;      /* File reference */
    ngx_buf_t       *shadow;    /* Shadow buffer */

    /* Bit flags */
    unsigned         temporary:1;   /* Memory buffer (volatile) */
    unsigned         memory:1;      /* Memory buffer (non-volatile) */
    unsigned         mmap:1;        /* Memory-mapped file */
    unsigned         in_file:1;     /* File buffer */
    unsigned         flush:1;       /* Flush buffered data */
    unsigned         sync:1;        /* Synchronous write */
    unsigned         last_buf:1;    /* Last buffer in chain */
    unsigned         last_in_chain:1; /* Last buffer in output chain */
    unsigned         recycled:1;    /* Can be reused */
} ngx_buf_t;
```

### ngx_chain_t (Buffer Chain)

```c
typedef struct ngx_chain_s {
    ngx_buf_t       *buf;
    ngx_chain_t     *next;
} ngx_chain_t;
```

## Data Structures

### Dynamic Arrays (ngx_array_t)

```c
typedef struct {
    void            *elts;    /* Element array */
    ngx_uint_t       nelts;   /* Number of elements */
    size_t           size;    /* Element size */
    ngx_uint_t       nalloc;  /* Allocated count */
    ngx_pool_t      *pool;    /* Memory pool */
} ngx_array_t;

/* Operations */
ngx_array_t *ngx_array_create(ngx_pool_t *p, ngx_uint_t n, size_t size);  /* Create */
void ngx_array_destroy(ngx_array_t *a);                                     /* Destroy */
void *ngx_array_push(ngx_array_t *a);                                       /* Push element */
void *ngx_array_push_n(ngx_array_t *a, ngx_uint_t n);                      /* Push N elements */
```

### Linked Lists (ngx_list_t)

```c
typedef struct {
    ngx_list_part_t  *last;    /* Last part */
    ngx_list_part_t   part;    /* First part */
    size_t            size;    /* Element size */
    ngx_uint_t        nalloc;  /* Elements per part */
    ngx_pool_t       *pool;    /* Memory pool */
} ngx_list_t;

/* Operations */
ngx_int_t ngx_list_init(ngx_list_t *list, ngx_pool_t *pool, ngx_uint_t n, size_t size);
void *ngx_list_push(ngx_list_t *list);
```

### Queues (ngx_queue_t)

```c
typedef struct ngx_queue_s  ngx_queue_t;
struct ngx_queue_s {
    ngx_queue_t  *prev;
    ngx_queue_t  *next;
};

/* Operations */
ngx_queue_init(q);
ngx_queue_insert_head(h, x);
ngx_queue_insert_tail(h, x);
ngx_queue_remove(x);
ngx_queue_add(h, n);
ngx_queue_head(h);
ngx_queue_last(h);
ngx_queue_sentinel(h);
ngx_queue_next(q);
ngx_queue_prev(q);
ngx_queue_insert_after(h, n);  /* Insert sorted */
ngx_queue_split(h, q, n);
ngx_queue_middle(h);
ngx_queue_sort(h, cmp);
```

### Red-Black Trees (ngx_rbtree_t)

```c
typedef struct ngx_rbtree_s  ngx_rbtree_t;
struct ngx_rbtree_s {
    ngx_rbtree_node_t     *root;
    ngx_rbtree_node_t     *sentinel;
    ngx_rbtree_insert_pt   insert;
};

typedef struct ngx_rbtree_node_s {
    ngx_rbtree_key_t       key;
    ngx_rbtree_node_t     *left;
    ngx_rbtree_node_t     *right;
    ngx_rbtree_node_t     *parent;
    u_char                 color;
    u_char                 data;
} ngx_rbtree_node_t;

/* Operations */
void ngx_rbtree_init(ngx_rbtree_t *tree, ngx_rbtree_node_t *s, ngx_rbtree_insert_pt i);
void ngx_rbtree_insert(ngx_rbtree_t *tree, ngx_rbtree_node_t *node);
void ngx_rbtree_delete(ngx_rbtree_t *tree, ngx_rbtree_node_t *node);
```

### Hash Tables (ngx_hash_t)

```c
typedef struct {
    ngx_hash_t       *hash;
    ngx_hash_keys_arrays_t *keys;
} ngx_hash_combined_t;

/* Operations */
ngx_int_t ngx_hash_init(ngx_hash_init_t *hinit, ngx_hash_key_t *names, ngx_uint_t nelts);
ngx_int_t ngx_hash_add_key(ngx_hash_keys_arrays_t *ha, ngx_str_t *key, void *value, ngx_uint_t flags);
void *ngx_hash_find(ngx_hash_t *hash, ngx_uint_t key, u_char *name, size_t len);
```

### Radix Trees (ngx_radix_tree_t)

```c
typedef struct ngx_radix_node_s  ngx_radix_node_t;
typedef struct {
    ngx_radix_node_t  *root;
    ngx_pool_t        *pool;
    ngx_radix_node_t  *free;
    char               start;
    size_t             size;
} ngx_radix_tree_t;

/* Operations */
ngx_radix_tree_t *ngx_radix_tree_create(ngx_pool_t *pool, ngx_int_t preallocate);
ngx_int_t ngx_radix32tree_insert(ngx_radix_tree_t *tree, uint32_t key, uint32_t mask, uintptr_t value);
ngx_int_t ngx_radix32tree_delete(ngx_radix_tree_t *tree, uint32_t key, uint32_t mask);
uintptr_t ngx_radix32tree_find(ngx_radix_tree_t *tree, uint32_t key);
```

## Memory Management

### Memory Pools (ngx_pool_t)

```c
typedef struct ngx_pool_s  ngx_pool_t;

/* Pool creation/destruction */
ngx_pool_t *ngx_create_pool(size_t size, ngx_log_t *log);
void ngx_destroy_pool(ngx_pool_t *pool);
void ngx_reset_pool(ngx_pool_t *pool);

/* Allocation */
void *ngx_palloc(ngx_pool_t *pool, size_t size);     /* Aligned */
void *ngx_pnalloc(ngx_pool_t *pool, size_t size);    /* Non-aligned */
void *ngx_pcalloc(ngx_pool_t *pool, size_t size);    /* Zeroed + aligned */
void *ngx_pmemalign(ngx_pool_t *pool, size_t size, size_t alignment);  /* Custom align */

/* Cleanup handlers */
ngx_pool_cleanup_t *ngx_pool_cleanup_add(ngx_pool_t *p, size_t size);
void ngx_pool_run_cleanup(ngx_pool_t *p);
void ngx_pool_cleanup_file(void *data);
void ngx_pool_delete_file(void *name);
```

### Pool Lifecycle

```
Request start --> pool created
  |
  v
Processing --> sub-pools created for modules
  |
  v
Request end --> entire pool destroyed (no need to free individual allocations)
```

### Pool Sizes

| Pool | Typical Size | Notes |
|------|-------------|-------|
| Connection pool | 256 bytes | Per connection |
| Request pool | 4096 bytes | Per HTTP request |
| Module temporary | varies | Create sub-pool as needed |

## Logging API

### ngx_log_error

```c
/* Log levels */
#define NGX_LOG_STDERR   0
#define NGX_LOG_EMERG    1
#define NGX_LOG_ALERT    2
#define NGX_LOG_CRIT     3
#define NGX_LOG_ERR      4
#define NGX_LOG_WARN     5
#define NGX_LOG_NOTICE   6
#define NGX_LOG_INFO     7
#define NGX_LOG_DEBUG    8

/* Log macros */
ngx_log_error(NGX_LOG_ERR, log, 0, "my_module: error occurred");
ngx_log_error(NGX_LOG_DEBUG_HTTP, log, 0, "my_module: request uri: %V", &r->uri);

/* Debug levels */
#define NGX_LOG_DEBUG_CORE     0x010
#define NGX_LOG_DEBUG_ALLOC    0x020
#define NGX_LOG_DEBUG_MUTEX    0x040
#define NGX_LOG_DEBUG_EVENT    0x080
#define NGX_LOG_DEBUG_HTTP     0x100
#define NGX_LOG_DEBUG_MAIL     0x200
#define NGX_LOG_DEBUG_STREAM   0x400
```

### Connection Logging

```c
/* Connection inherits log from configuration */
c->log->log_level = NGX_LOG_DEBUG_HTTP;

/* Create connection log */
c->log = ngx_create_log(c->pool, log->log_level, log);
```

## Time Functions

### Time Caching

```c
/* Update cached time (called in event loop) */
ngx_time_update();

/* Get cached time */
time_t ngx_time();                   /* Current epoch seconds */
ngx_msec_t ngx_current_msec;        /* Current ms from epoch */
ngx_time_t *ngx_timeofday();        /* struct tm */

/* Time strings */
u_char *ngx_cached_http_time;       /* HTTP time format */
u_char *ngx_cached_http_log_time;   /* Log time format */
u_char *ngx_cached_err_log_time;    /* Error log time format */
u_char *ngx_cached_syslog_time;     /* Syslog time format */

/* ngx_tm structure */
typedef struct {
    ngx_uint_t  sec;       /* Seconds */
    ngx_uint_t  min;       /* Minutes */
    ngx_uint_t  hour;      /* Hours */
    ngx_uint_t  mday;      /* Day of month */
    ngx_uint_t  mon;       /* Month (0-11) */
    ngx_uint_t  year;      /* Year */
    ngx_uint_t  wday;      /* Day of week (0-6) */
    ngx_uint_t  yday;      /* Day of year */
} ngx_tm_t;
```

## Socket Management

### Socket Creation

```c
ngx_socket_t ngx_socket(int domain, int type, int protocol);
ngx_int_t ngx_connection_local_sockaddr(ngx_connection_t *c, ngx_sockaddr_t *sa, socklen_t slen);
ngx_int_t ngx_tcp_nodelay(ngx_connection_t *c);
ngx_int_t ngx_tcp_nopush(ngx_connection_t *c);
```

### Connection Lifecycle

1. `ngx_event_accept()` - Accept connection → `ngx_connection_t`
2. Handler set on `c->listening->handler`
3. Data processed via event handlers
4. `ngx_close_connection()` - Close

## Process Lifecycle

### Process Types

| Process | Function | Description |
|---------|----------|-------------|
| Master | `ngx_master_process_cycle()` | Configuration, signal handling |
| Worker | `ngx_worker_process_cycle()` | Request processing |
| Cache Manager | `ngx_cache_manager_process_cycle()` | Cache cleanup |
| Cache Loader | `ngx_cache_loader_process_cycle()` | Cache preload |

### Startup Sequence

```
main()
  -> ngx_init_signals()
  -> ngx_init_cycle()          # Parse config, open sockets
  -> ngx_master_process_cycle()
       -> ngx_start_worker_processes()
            -> ngx_worker_process_cycle()
                 -> ngx_worker_process_init()
                      -> ngx_event_process_init()
                           -> ngx_event_accept() loop
```

## Events

### Event Loop

```c
/* Main event loop in worker */
for (;;) {
    ngx_process_events_and_timers(cycle);
}
```

### Event Actions

```c
typedef struct {
    ngx_event_handler_pt    handler;  /* Event handler */
    ngx_connection_t       *data;     /* Connection reference */
    unsigned                write:1;  /* Write event flag */
    unsigned                accept:1; /* Accept event flag */
    unsigned                timedout:1; /* Timer expired */
    unsigned                timer_set:1; /* Timer active */
    ngx_msec_t              timer;    /* Timer value */
    ngx_queue_t             queue;    /* Event queue */
} ngx_event_t;
```

### Posted Events

```c
ngx_int_t ngx_post_event(ngx_event_t *ev, ngx_queue_t *q);   /* Queue event */
void ngx_delete_posted_event(ngx_event_t *ev);                /* Remove from queue */
void ngx_event_process_posted(ngx_cycle_t *cycle, ngx_queue_t *posted);  /* Process posted */
```

### Timers

```c
void ngx_add_timer(ngx_event_t *ev, ngx_msec_t timer);       /* Start timer */
ngx_msec_t ngx_find_prev_event(ngx_event_t *ev);             /* Find previous timer */
void ngx_event_expire_timers();                              /* Expire timers */
```

## HTTP Module Architecture

### HTTP Phases

```c
typedef enum {
    NGX_HTTP_POST_READ_PHASE = 0,   /* Read request headers */
    NGX_HTTP_SERVER_REWRITE_PHASE,  /* server-level rewrite */
    NGX_HTTP_FIND_CONFIG_PHASE,     /* Location matching */
    NGX_HTTP_REWRITE_PHASE,         /* Location-level rewrite */
    NGX_HTTP_POST_REWRITE_PHASE,    /* Post rewrite (internal redirect) */
    NGX_HTTP_PREACCESS_PHASE,       /* Pre-access checks */
    NGX_HTTP_ACCESS_PHASE,          /* Access control */
    NGX_HTTP_POST_ACCESS_PHASE,     /* Post access (satisfy any) */
    NGX_HTTP_PRECONTENT_PHASE,      /* Pre-content handlers */
    NGX_HTTP_CONTENT_PHASE,         /* Content generation */
    NGX_HTTP_LOG_PHASE              /* Logging */
} ngx_http_phases;
```

### Registering a Phase Handler

```c
/* In module postconfiguration */
static ngx_int_t
ngx_http_my_module_init(ngx_conf_t *cf)
{
    ngx_http_handler_pt        *h;
    ngx_http_core_main_conf_t  *cmcf;

    cmcf = ngx_http_conf_get_module_main_conf(cf, ngx_http_core_module);

    h = ngx_array_push(&cmcf->phases[NGX_HTTP_ACCESS_PHASE].handlers);
    if (h == NULL) {
        return NGX_ERROR;
    }

    *h = ngx_http_my_access_handler;

    return NGX_OK;
}
```

### Phase Handler Function

```c
static ngx_int_t
ngx_http_my_handler(ngx_http_request_t *r)
{
    /* Return values */
    return NGX_OK;           /* Continue to next handler */
    return NGX_DECLINED;     /* Next module */
    return NGX_DONE;         /* Async, will complete later */
    return NGX_AGAIN;        /* Need more data */
    return NGX_ERROR;        /* Error, connection close */
}
```

## HTTP Filter Modules

### Filter Types

```c
/* Header filter - called after response headers are generated */
typedef ngx_int_t (*ngx_http_output_header_filter_pt)(ngx_http_request_t *r);
typedef ngx_int_t (*ngx_http_output_body_filter_pt)(ngx_http_request_t *r, ngx_chain_t *chain);

/* Input filter - called on request body */
typedef ngx_int_t (*ngx_http_input_body_filter_pt)(ngx_http_request_t *r, ngx_chain_t *chain);
```

### Registering a Filter

```c
/* Static filter registration */
static ngx_http_output_header_filter_pt  ngx_http_next_header_filter;
static ngx_http_output_body_filter_pt    ngx_http_next_body_filter;

static ngx_int_t
ngx_http_my_filter_init(ngx_conf_t *cf)
{
    ngx_http_next_header_filter = ngx_http_top_header_filter;
    ngx_http_top_header_filter = ngx_http_my_header_filter;

    ngx_http_next_body_filter = ngx_http_top_body_filter;
    ngx_http_top_body_filter = ngx_http_my_body_filter;

    return NGX_OK;
}
```

### Filter Implementation

```c
static ngx_int_t
ngx_http_my_header_filter(ngx_http_request_t *r)
{
    /* Modify headers */
    ngx_table_elt_t *h = ngx_list_push(&r->headers_out.headers);
    if (h == NULL) {
        return NGX_ERROR;
    }
    h->key = ngx_string("X-My-Header");
    h->value = ngx_string("my-value");
    h->hash = 1;

    return ngx_http_next_header_filter(r);
}

static ngx_int_t
ngx_http_my_body_filter(ngx_http_request_t *r, ngx_chain_t *chain)
{
    /* Process/modify response body */
    ngx_buf_t *buf = ngx_alloc_buf(r->pool);
    /* ... modify chain ... */

    return ngx_http_next_body_filter(r, chain);
}
```

## Upstream Module Development

### Upstream Structures

```c
typedef struct {
    ngx_http_upstream_srv_conf_t    *upstream;

    ngx_addr_t                      *addrs;    /* Resolved addresses */
    ngx_uint_t                       naddrs;   /* Address count */
    ngx_uint_t                       current;  /* Current server */
    ngx_uint_t                       tries;    /* Attempted servers */

    /* Weighted round-robin data */
    ngx_uint_t                      *weights;
    ngx_uint_t                       last_weight;
} ngx_http_upstream_rr_peer_data_t;
```

### Upstream Callbacks

```c
/* Set in r->upstream */
typedef struct {
    ngx_http_upstream_init_pt         init;           /* Init upstream */
    ngx_http_upstream_init_peer_pt    init_peer;      /* Init peer */
    ngx_http_upstream_get_peer_pt     get;            /* Get peer */
    ngx_http_upstream_free_peer_pt    free;           /* Free peer */
} ngx_http_upstream_peer_t;
```

## Variable Creation

### Creating a Variable

```c
static ngx_int_t
ngx_http_my_variable(ngx_http_request_t *r, ngx_http_variable_value_t *v, uintptr_t data)
{
    v->valid = 1;
    v->no_cacheable = 0;
    v->not_found = 0;
    v->len = sizeof("my_value") - 1;
    v->data = (u_char *) "my_value";

    return NGX_OK;
}

/* Register in postconfiguration */
static ngx_int_t
ngx_http_my_add_variables(ngx_conf_t *cf)
{
    ngx_http_variable_t  *var;

    var = ngx_http_add_variable(cf, &ngx_string("my_variable"), NGX_HTTP_VAR_CHANGEABLE);
    if (var == NULL) {
        return NGX_ERROR;
    }

    var->get_handler = ngx_http_my_variable;
    var->set_handler = ngx_http_set_unchanged;  /* Read-only */

    return NGX_OK;
}
```

## Configuration Directives

### ngx_command_t

```c
struct ngx_command_s {
    ngx_str_t             name;         /* Directive name */
    ngx_uint_t            type;         /* Directive type flags */
    char                 *(*set)(ngx_conf_t *cf, ngx_command_t *cmd, void *conf);
    ngx_uint_t            conf;         /* Config field offset */
    ngx_uint_t            offset;       /* Field offset in module config */
    void                 *post;         /* Post-processing handler */
};

/* Example for a simple directive */
static ngx_command_t  ngx_http_my_commands[] = {
    { ngx_string("my_directive"),
      NGX_HTTP_MAIN_CONF | NGX_HTTP_SRV_CONF | NGX_HTTP_LOC_CONF | NGX_CONF_TAKE1,
      ngx_conf_set_str_slot,
      NGX_HTTP_LOC_CONF_OFFSET,
      offsetof(ngx_http_my_loc_conf_t, my_param),
      NULL },

    ngx_null_command  /* Terminator */
};
```

### Directive Types

| Flag | Description |
|------|-------------|
| `NGX_CONF_NOARGS` | No arguments |
| `NGX_CONF_TAKE1` | Exactly 1 arg |
| `NGX_CONF_TAKE2` | Exactly 2 args |
| `NGX_CONF_TAKE3` | Exactly 3 args |
| `NGX_CONF_TAKE4` | Exactly 4 args |
| `NGX_CONF_TAKE5` | Exactly 5 args |
| `NGX_CONF_TAKE6` | Exactly 6 args |
| `NGX_CONF_TAKE7` | Exactly 7 args |
| `NGX_CONF_TAKE12` | 1 or 2 args |
| `NGX_CONF_TAKE13` | 1 or 3 args |
| `NGX_CONF_TAKE23` | 2 or 3 args |
| `NGX_CONF_TAKE123` | 1, 2, or 3 args |
| `NGX_CONF_TAKE1234` | 1, 2, 3, or 4 args |
| `NGX_CONF_1MORE` | 1 or more args |
| `NGX_CONF_2MORE` | 2 or more args |
| `NGX_CONF_MULTI` | Multiple values (separate directives) |
| `NGX_CONF_BLOCK` | Block directive (includes `{ }`) |
| `NGX_CONF_FLAG` | `on` or `off` |
| `NGX_CONF_ANY` | Any number of args |
| `NGX_DIRECT_CONF` | Direct configuration (1 slot) |
| `NGX_MAIN_CONF` | Main context |
| `NGX_ANY_CONF` | Any context |

### Config Context Flags

| Flag | Context |
|------|---------|
| `NGX_HTTP_MAIN_CONF` | `http { }` |
| `NGX_HTTP_SRV_CONF` | `server { }` |
| `NGX_HTTP_LOC_CONF` | `location { }` |
| `NGX_HTTP_UPS_CONF` | `upstream { }` |
| `NGX_HTTP_SIF_CONF` | `server if { }` |
| `NGX_HTTP_LIF_CONF` | `location if { }` |
| `NGX_HTTP_LMT_CONF` | `limit_except { }` |

### Set Functions

| Function | Description |
|----------|-------------|
| `ngx_conf_set_flag_slot` | `on`/`off` → `ngx_flag_t` (1/0) |
| `ngx_conf_set_str_slot` | String → `ngx_str_t` |
| `ngx_conf_set_str_array_slot` | Array of strings → `ngx_array_t` |
| `ngx_conf_set_keyval_slot` | Key-value pairs → `ngx_array_t` |
| `ngx_conf_set_num_slot` | Number → `ngx_int_t` |
| `ngx_conf_set_size_slot` | Size → `size_t` |
| `ngx_conf_set_off_slot` | Offset → `off_t` |
| `ngx_conf_set_msec_slot` | Time → `ngx_msec_t` |
| `ngx_conf_set_sec_slot` | Seconds → `time_t` |
| `ngx_conf_set_bufs_slot` | Number x Size → `ngx_bufs_t` |
| `ngx_conf_set_enum_slot` | Enum string → `ngx_uint_t` |
| `ngx_conf_set_bitmask_slot` | Bitmask flags → `ngx_uint_t` |
| `ngx_conf_set_path_slot` | Cache path → `ngx_path_t*` |
| `ngx_conf_set_access_slot` | File permissions → `ngx_file_access_t` |

## Module Structure

### ngx_module_t

```c
struct ngx_module_s {
    /* Module metadata */
    ngx_uint_t            ctx_index;    /* Index in context */
    ngx_uint_t            index;        /* Global module index */

    char                 *name;         /* Module name string */

    /* Module callbacks */
    ngx_uint_t            spare0;       /* Reserved */
    ngx_uint_t            spare1;       /* Reserved */
    ngx_uint_t            version;      /* NGINX version compatibility */
    const char           *signature;    /* Module signature */

    /* Context-specific data */
    void                 *ctx;          /* Module context */
    ngx_command_t        *commands;     /* Directive array */
    ngx_uint_t            type;         /* Module type */

    /* Init hooks */
    ngx_int_t           (*init_module)(ngx_cycle_t *cycle);
    ngx_int_t           (*init_process)(ngx_cycle_t *cycle);
    ngx_int_t           (*init_thread)(ngx_cycle_t *cycle);
    void                (*exit_thread)(ngx_cycle_t *cycle);
    void                (*exit_process)(ngx_cycle_t *cycle);
    void                (*exit_master)(ngx_cycle_t *cycle);

    /* Reserved slots */
    uintptr_t             spare_hook0;
    uintptr_t             spare_hook1;
    uintptr_t             spare_hook2;
    uintptr_t             spare_hook3;
    uintptr_t             spare_hook4;
    uintptr_t             spare_hook5;
    uintptr_t             spare_hook6;
};
```

### Module Types

| Type | Description |
|------|-------------|
| `NGX_HTTP_MODULE` | HTTP module |
| `NGX_STREAM_MODULE` | Stream module |
| `NGX_MAIL_MODULE` | Mail module |
| `NGX_EVENT_MODULE` | Event module |
| `NGX_CORE_MODULE` | Core module |

### HTTP Module Context

```c
typedef struct {
    /* Config create/merge for each context level */
    void               *(*create_main_conf)(ngx_conf_t *cf);
    char               *(*init_main_conf)(ngx_conf_t *cf, void *conf);

    void               *(*create_srv_conf)(ngx_conf_t *cf);
    char               *(*merge_srv_conf)(ngx_conf_t *cf, void *parent, void *child);

    void               *(*create_loc_conf)(ngx_conf_t *cf);
    char               *(*merge_loc_conf)(ngx_conf_t *cf, void *parent, void *child);
} ngx_http_module_t;
```

### Module Declaration

```c
static ngx_http_module_t  ngx_http_my_module_ctx = {
    ngx_http_my_create_main_conf,       /* create main configuration */
    ngx_http_my_init_main_conf,         /* init main configuration */
    ngx_http_my_create_srv_conf,        /* create server configuration */
    ngx_http_my_merge_srv_conf,         /* merge server configuration */
    ngx_http_my_create_loc_conf,        /* create location configuration */
    ngx_http_my_merge_loc_conf          /* merge location configuration */
};

static ngx_command_t  ngx_http_my_commands[] = {
    ngx_null_command
};

ngx_module_t  ngx_http_my_module = {
    NGX_MODULE_V1,
    &ngx_http_my_module_ctx,       /* module context */
    ngx_http_my_commands,          /* module directives */
    NGX_HTTP_MODULE,               /* module type */
    NULL,                          /* init master */
    NULL,                          /* init module */
    NULL,                          /* init process */
    NULL,                          /* init thread */
    NULL,                          /* exit thread */
    NULL,                          /* exit process */
    NULL,                          /* exit master */
    NGX_MODULE_V1_PADDING
};
```

## Code Style Guidelines

### Naming

- Module functions prefixed with module name: `ngx_http_my_module_*`
- Types: `ngx_http_my_module_*_t`
- Variables: descriptive, `r` for request, `c` for connection
- Macros: UPPER_CASE
- Enums: UPPER_CASE

### Formatting

- Indentation: 4 spaces (no tabs)
- Braces on same line for functions
- Line length: 80 characters preferred
- One statement per line
- Comments explain WHY, not WHAT

### Common Patterns

```c
/* Error handling pattern */
if (ptr == NULL) {
    ngx_log_error(NGX_LOG_ERR, log, 0, "my_module: allocation failed");
    return NGX_ERROR;
}

/* Pool allocation */
char *str = ngx_palloc(pool, size);

/* String operations */
ngx_str_t val = ngx_string("value");
ngx_str_set(&str, "literal");
```

## Testing Procedures

### Unit Testing

```c
/* Build test module with --add-module */
/* Use nginx -t to validate configuration */

/* Debug log testing */
error_log /var/log/nginx/error.log debug;

/* Test with curl */
curl -v http://localhost/test
curl -X POST -d "body" http://localhost/test
curl -I http://localhost/test
```

### Memory Leak Detection

- Use `ngx_pcalloc()` instead of `ngx_palloc()` to zero memory
- Ensure cleanup handlers are registered for non-pool resources
- Test with `valgrind`:
  ```
  valgrind --tool=memcheck --leak-check=full nginx -c test.conf
  ```

### Module Testing Checklist

- [ ] Configuration syntax validates correctly
- [ ] Default values are sensible
- [ ] Edge cases handled (empty input, missing config)
- [ ] Error paths don't cause crashes
- [ ] Memory is properly freed on cleanup
- [ ] Works with both direct and dynamic module loading
- [ ] Performance doesn't degrade with load
- [ ] Works across configuration reload
- [ ] Graceful worker shutdown works
