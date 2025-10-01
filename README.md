# SpacetimeDB Admin Portal

A professional Next.js admin portal for managing SpacetimeDB instances via HTTP API. Features runtime schema discovery, data viewing, CRUD operations, and comprehensive database management without code generation.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env.local`:

```bash
# SpacetimeDB Configuration
NEXT_PUBLIC_SPACETIME_URI=wss://your-spacetime-server.com
NEXT_PUBLIC_SPACETIME_MODULE=your-database-identity
NEXT_PUBLIC_SPACETIME_HTTP_API=https://your-spacetime-server.com/v1/database

# Authentication Token (required for logs and admin endpoints)
# Find your token in: ~/.config/spacetime/cli.toml
# Or run: spacetime identity show
SPACETIME_AUTH_TOKEN=your-auth-token-here

# Keep version as needed
NEXT_PUBLIC_SPACETIME_MODULE_VERSION=9

# Application Configuration
NEXT_PUBLIC_APP_NAME="SpacetimeDB Admin Portal"

# Advanced Configuration
NEXT_PUBLIC_SPACETIME_MAX_RETRIES=3
NEXT_PUBLIC_SPACETIME_RETRY_BACKOFF=2
NEXT_PUBLIC_CACHE_TTL_MINUTES=10
NEXT_PUBLIC_MAX_LIVE_ROWS=10000

# Authentication - CHANGE THESE CREDENTIALS!
# Username and password for admin access
AUTH_USERNAME=admin
AUTH_PASSWORD=change-this-password

# Better Auth Configuration
# Generate a secure random string (minimum 32 characters)
BETTER_AUTH_SECRET=generate-a-secure-random-string-here-min-32-chars
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Finding Your Auth Token

Your SpacetimeDB authentication token is located in:

```
~/.config/spacetime/cli.toml
```

The token is required for:
- Accessing server logs
- Admin/owner-only operations
- Publishing modules
- Server-side API calls

## Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack), React 19
- **UI**: shadcn/ui, Tailwind CSS, Radix UI
- **State Management**: Zustand (UI state), TanStack React Query (data fetching & caching)
- **Database**: SpacetimeDB (via HTTP API)
- **Auth**: Better Auth
- **Validation**: Zod
- **TypeScript**: Full type safety

## Organizing Reducers with Metadata

To make your reducers more discoverable and better organized in admin tools, implement a metadata table. This allows you to categorize, document, and control access to reducers.

### 1. Define the Metadata Table

Add this to your SpacetimeDB module:

```rust
use spacetimedb::Timestamp;

/// Reducer metadata for frontend categorization and documentation
#[spacetimedb::table(name = reducer_metadata, public)]
#[derive(Debug, Clone)]
pub struct ReducerMetadata {
    #[primary_key]
    pub reducer_name: String,
    pub category: String,        // "admin", "player", "marketplace", etc.
    pub subcategory: String,     // "management", "actions", "query", etc.
    pub required_role: String,   // "any", "authenticated", "admin", "owner"
    pub description: String,
    pub is_deprecated: bool,
    pub tags: String,            // Comma-separated: "economy,trading,public"
    pub sort_order: u32,         // For custom sorting
    pub created_at: Timestamp,
}
```

### 2. Initialize Metadata in Your Init Reducer

```rust
pub fn initialize_reducer_metadata(ctx: &spacetimedb::ReducerContext) -> Result<(), String> {
    use spacetimedb::Table;
    
    let metadata = vec![
        // System reducers
        ReducerMetadata {
            reducer_name: "init".to_string(),
            category: "system".to_string(),
            subcategory: "lifecycle".to_string(),
            required_role: "any".to_string(),
            description: "Initialize database (first call becomes owner)".to_string(),
            is_deprecated: false,
            tags: "system,lifecycle,admin".to_string(),
            sort_order: 1,
            created_at: ctx.timestamp,
        },
        
        // Player actions
        ReducerMetadata {
            reducer_name: "update_player_name".to_string(),
            category: "player".to_string(),
            subcategory: "profile".to_string(),
            required_role: "authenticated".to_string(),
            description: "Update player display name".to_string(),
            is_deprecated: false,
            tags: "player,profile,settings".to_string(),
            sort_order: 200,
            created_at: ctx.timestamp,
        },
        
        // Admin operations
        ReducerMetadata {
            reducer_name: "grant_admin".to_string(),
            category: "admin".to_string(),
            subcategory: "roles".to_string(),
            required_role: "owner".to_string(),
            description: "Grant admin role to a player".to_string(),
            is_deprecated: false,
            tags: "admin,security,roles".to_string(),
            sort_order: 100,
            created_at: ctx.timestamp,
        },
    ];
    
    // Insert all metadata
    for meta in metadata {
        ctx.db.reducer_metadata().try_insert(meta)?;
    }
    
    log::info!("✅ Reducer metadata initialized");
    Ok(())
}
```

### 3. Call During Initialization

```rust
#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) -> Result<(), String> {
    // Your other init logic...
    
    // Initialize reducer metadata
    initialize_reducer_metadata(ctx)?;
    
    Ok(())
}
```

### Benefits

- **Auto-documentation**: Frontend can display reducers with descriptions and categories
- **Role-based filtering**: Hide admin-only reducers from regular users if setup
- **Better organization**: Group related reducers together
- **Deprecation tracking**: Mark old reducers as deprecated
- **Search & discovery**: Tags make reducers searchable
- **Custom sorting**: Control display order

## Project Structure

```
spacetime-admin-portal/
├── app/
│   ├── (dashboard)/           # Dashboard routes
│   │   ├── page.tsx          # Dashboard home
│   │   ├── tables/[name]/    # Table view
│   │   ├── backup/           # Backup & restore
│   │   └── settings/         # Settings
│   ├── api/                  # API routes
│   │   ├── schema/           # Schema discovery
│   │   └── sql/              # Query & mutation endpoints
│   ├── layout.tsx            # Root layout
│   └── providers.tsx         # Client providers
├── components/
│   ├── ui/                   # shadcn components
│   └── layout/               # Layout components
├── lib/
│   ├── spacetime/            # SpacetimeDB clients
│   │   ├── http-client.ts   # HTTP API client
│   │   ├── sdk-client.ts    # WebSocket SDK wrapper
│   │   └── schema-discovery.ts
│   ├── config.ts             # App configuration
│   └── utils.ts              # Utility functions
├── hooks/
│   ├── use-tables.ts         # Table listing hooks
│   └── use-table-data.ts     # Table data hooks
└── types/
    ├── spacetime.ts          # SpacetimeDB types
    ├── schema.ts             # Schema types
    └── api.ts                # API types
```

## Architecture

### HTTP API Based

- **Server-Side**: SpacetimeDB HTTP API for all operations (queries, mutations, schema discovery)
- **Client-Side**: TanStack React Query for efficient data fetching, caching, and state management
- **Schema**: Runtime discovery via HTTP API (no code generation or bindings needed)
- **No WebSocket**: Currently using HTTP polling; real-time subscriptions can be added later if needed

### Key Features

✅ **Runtime schema discovery** - No code generation required  
✅ **Smart caching** - TanStack Query with 5-minute stale time + exponential backoff retries  
✅ **Type-safe** - Full TypeScript + Zod validation  
✅ **Professional UI** - shadcn/ui components with dark mode  
✅ **Efficient polling** - Configurable cache TTL prevents expensive API overages  
✅ **Error handling** - Comprehensive error boundaries and user feedback  
✅ **Optimized** - Retry limits, smart caching, pagination to minimize costs  

## API Endpoints

### Schema Discovery

- `GET /api/schema/tables` - List all tables
- `POST /api/schema/tables` - Refresh schema cache
- `GET /api/schema/table/[name]` - Get table schema

### Data Operations

- `POST /api/sql/query` - Execute SELECT with pagination
- `POST /api/sql/mutate` - Execute INSERT/UPDATE/DELETE
- `POST /api/sql/bulk` - Bulk operations

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_SPACETIME_URI` | WebSocket URI | `wss://your-server.com` |
| `NEXT_PUBLIC_SPACETIME_MODULE` | Database identity | (required) |
| `NEXT_PUBLIC_SPACETIME_HTTP_API` | HTTP API URL | `https://your-server.com/v1/database` |
| `SPACETIME_AUTH_TOKEN` | Auth token for admin ops | (required, see `~/.config/spacetime/cli.toml`) |
| `NEXT_PUBLIC_SPACETIME_MODULE_VERSION` | Module version | `9` |
| `NEXT_PUBLIC_SPACETIME_MAX_RETRIES` | Max retry attempts | `3` |
| `NEXT_PUBLIC_SPACETIME_RETRY_BACKOFF` | Retry backoff multiplier | `2` |
| `NEXT_PUBLIC_CACHE_TTL_MINUTES` | Schema cache TTL | `10` |
| `NEXT_PUBLIC_MAX_LIVE_ROWS` | Subscription row limit | `10000` |
| `AUTH_USERNAME` | Admin username | `admin` |
| `AUTH_PASSWORD` | Admin password | **CHANGE THIS!** |
| `BETTER_AUTH_SECRET` | Better Auth secret (32+ chars) | (required) |
| `BETTER_AUTH_URL` | Better Auth URL | `http://localhost:3000` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Better Auth public URL | `http://localhost:3000` |

### Performance Settings

- **Schema Caching**: 10-minute TTL (configurable) - reduces API calls
- **Query Caching**: 5-minute stale time with TanStack React Query
- **Retry Policy**: Max 3 retries with exponential backoff (1s, 2s, 4s...)
- **Max Live Rows**: 10,000 row limit to prevent expensive operations
- **Request Deduplication**: TanStack Query automatically deduplicates identical requests

## Development

### Build for Production

```bash
npm run build
npm start
```


## Best Practices

### Efficiency & Cost Optimization

This app is optimized for minimal API usage on Supabase, Vercel, and other metered platforms:

- **Smart Caching**: TanStack Query caches data for 5 minutes (stale time) - reduces redundant API calls
- **Retry Limits**: Max 3 retries with exponential backoff - prevents infinite retry loops
- **Request Deduplication**: Multiple components requesting same data only triggers one API call
- **Row Limits**: 10,000 max rows to prevent fetching massive datasets
- **Schema Caching**: 10-minute TTL on schema discovery - schema rarely changes
- **HTTP API Only**: Simple fetch-based architecture
- **Batch Operations**: Use bulk endpoints when available
- **Conditional Fetching**: Queries disabled until required data is available (`enabled` flag)

### Security

- Keep `SPACETIME_AUTH_TOKEN` in `.env.local` (never commit)
- Use environment variables for all configuration
- Implement proper role-based access control
- Validate all inputs with Zod

## License

MIT

---

Built with ❤️ for SpacetimeDB
