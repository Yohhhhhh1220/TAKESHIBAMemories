# Neonデータベース設定ガイド

## Vercel環境変数の設定

Vercelダッシュボードで以下の環境変数を設定してください：

### 1. OpenAI API Key
```
OPENAI_API_KEY=your-openai-api-key-here
```

### 2. Neonデータベース接続（優先順位順）

**推奨（Pooler接続）:**
```
POSTGRES_URL=postgresql://username:password@your-neon-host/neondb?sslmode=require
```

**または標準PostgreSQL接続:**
```
DATABASE_URL=postgresql://username:password@your-neon-host/neondb?sslmode=require
```

**個別設定（上記が動作しない場合）:**
```
PGHOST=your-neon-host
PGUSER=your-username
PGDATABASE=neondb
PGPASSWORD=your-password
```

## 環境変数の設定手順

1. Vercelダッシュボードにアクセス
2. プロジェクト `takeshiba-memories-a3or` を開く
3. 「Settings」→「Environment Variables」をクリック
4. 以下の環境変数を追加：

| Key | Value |
|-----|-------|
| `OPENAI_API_KEY` | `your-openai-api-key-here` |
| `POSTGRES_URL` | `postgresql://username:password@your-neon-host/neondb?sslmode=require` |

5. **重要**: 環境変数を追加した後、**「Redeploy」**を実行してください

## 確認事項

- ✅ OpenAI APIキーが設定されている
- ✅ POSTGRES_URLが設定されている（またはDATABASE_URL）
- ✅ 環境変数を追加後にRedeployを実行した

## トラブルシューティング

### データベース接続エラー
- POSTGRES_URLが正しく設定されているか確認
- Neonダッシュボードでデータベースがアクティブか確認
- SSL接続が必要な場合、`?sslmode=require`が含まれているか確認

### 川柳生成エラー
- OPENAI_API_KEYが正しく設定されているか確認
- APIキーの有効性を確認
- Vercelのログでエラーメッセージを確認

