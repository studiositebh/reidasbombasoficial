
# Melhorias na Pagina de Categoria

## O que sera feito

### 1. Filtro de Categorias no Sidebar

Adicionar uma secao "Categorias" no topo do sidebar esquerdo, listando todas as 8 categorias com o nome e a contagem de produtos. A categoria atual fica destacada visualmente. Clicar em outra categoria navega para ela.

### 2. Barra de Ordenacao

Adicionar uma barra entre o titulo e o grid de produtos com:
- Contagem de produtos (ja existe, sera movida para ca)
- Select de ordenacao com opcoes:
  - Mais relevantes (padrao)
  - Menor preco
  - Maior preco
  - Nome A-Z
  - Nome Z-A
  - Mais recentes

### 3. Contagem de produtos nos filtros

Mostrar ao lado de cada opcao de filtro (marca, tamanho) quantos produtos correspondem.

## Detalhes Tecnicos

### Arquivo: `src/pages/Category.tsx`

**1. Novo estado de ordenacao:**

```typescript
const [sortBy, setSortBy] = useState("relevance");
```

**2. Secao de categorias no sidebar (antes de Faixa de Preco):**

```typescript
<div className="bg-card border border-border rounded-lg p-4">
  <h3 className="font-bold text-foreground text-sm mb-4">Categorias</h3>
  <div className="space-y-1">
    {categories.map((cat) => (
      <Link
        key={cat.id}
        to={`/categoria/${cat.slug}`}
        className={`block px-3 py-2 text-sm rounded-md transition-colors ${
          cat.slug === slug
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        {cat.name}
        <span className="text-xs ml-1 opacity-60">({cat.product_count})</span>
      </Link>
    ))}
  </div>
</div>
```

**3. Barra de ordenacao acima do grid:**

Substituir o paragrafo simples de contagem por uma barra com Select de ordenacao usando o componente `Select` do shadcn/ui.

**4. Logica de ordenacao no `useMemo` dos filteredProducts:**

Apos filtrar, aplicar sort baseado no `sortBy`:
- `price-asc`: menor preco primeiro
- `price-desc`: maior preco primeiro
- `name-asc`: nome A-Z
- `name-desc`: nome Z-A
- `newest`: mais recentes (por created_at)
- `relevance`: ordem padrao (sem sort adicional)

## Resumo de Alteracoes

| Arquivo | O que muda |
|---|---|
| `src/pages/Category.tsx` | Adicionar filtro de categorias no sidebar, barra de ordenacao, e logica de sort |
