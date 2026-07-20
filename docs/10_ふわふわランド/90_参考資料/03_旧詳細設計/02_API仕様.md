# 03-02 API仕様書

> 最終更新: 2026-06-23

MVPでは内部関数として実装する。将来HTTP API化できるよう、入出力を固定する。

## registerArtwork

```ts
type RegisterArtworkInput = {
  sourceImageUrl: string;
  processedImageUrl?: string;
  consentScope: 'event_only' | 'SNS_allowed' | 'unknown';
  notes?: string;
};
```

```ts
type RegisterArtworkOutput = {
  artwork: Artwork;
};
```

## showArtwork

```ts
type ShowArtworkInput = {
  artworkId: string;
  mode: 'normal' | 'featured';
};
```

## hideArtwork

```ts
type HideArtworkInput = {
  artworkId: string;
  reason?: string;
};
```

## resetDisplay

```ts
type ResetDisplayInput = {
  keepPool: boolean;
};
```

`keepPool: true` が標準。表示中作品だけを消し、登録済み作品は残す。

## randomizeDisplay

```ts
type RandomizeDisplayInput = {
  count: number;
  includeAlreadyShown: boolean;
};
```

## processArtworkImage

```ts
type ProcessArtworkImageInput = {
  imageUrl: string;
  removeWhiteBackground: boolean;
  maxSize: number;
};
```

```ts
type ProcessArtworkImageOutput = {
  processedImageUrl: string;
  warnings: string[];
};
```

