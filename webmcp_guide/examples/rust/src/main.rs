//! Example Shoppe — WebMCP com axum.
//!
//! O WebMCP em si roda no navegador (document.modelContext, JavaScript).
//! O Rust participa como backend das ferramentas e como servidor da página.
//!
//! Rode com:  cargo run  →  http://localhost:3000

use axum::{
    Json, Router,
    extract::Query,
    routing::get,
    serve,
};
use serde::{Deserialize, Serialize};
use tower_http::services::ServeDir;

#[derive(Serialize, Clone)]
struct Product {
    id: String,
    name: String,
    price: f64,
}

#[derive(Deserialize)]
struct SearchParams {
    q: Option<String>,
}

fn catalog() -> Vec<Product> {
    vec![
        Product { id: "JACKET002".into(), name: "Jaqueta preta".into(), price: 89.9 },
        Product { id: "JEANS001".into(), name: "Jeans".into(), price: 49.9 },
        Product { id: "TSHIRT003".into(), name: "Camiseta estampada".into(), price: 19.9 },
    ]
}

/// Endpoint chamado pelo `execute()` da ferramenta `search_products`.
async fn search_products(Query(params): Query<SearchParams>) -> Json<Vec<Product>> {
    let query = params.q.unwrap_or_default().to_lowercase();
    let matches = catalog()
        .into_iter()
        .filter(|p| query.is_empty() || p.name.to_lowercase().contains(&query))
        .collect();

    // Saída enxuta: apenas o essencial para o LLM decidir o próximo passo.
    Json(matches)
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/api/products", get(search_products))
        // Página com o registro das ferramentas (JS) em static/index.html
        .fallback_service(ServeDir::new("static"));

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .expect("falha ao ligar em 127.0.0.1:3000");
    println!("Servindo em http://127.0.0.1:3000");

    serve(listener, app).await.expect("erro ao servir");
}
