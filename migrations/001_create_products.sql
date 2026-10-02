BEGIN;

CREATE TABLE products (
  id TEXT PRIMARY KEY
    CONSTRAINT products_id_nonempty CHECK (length(btrim(id)) > 0),

  title TEXT NOT NULL
    CONSTRAINT products_title_nonempty CHECK (length(btrim(title)) > 0),

  short_name TEXT NOT NULL
    CONSTRAINT products_short_name_nonempty CHECK (length(btrim(short_name)) > 0),

  general_info TEXT NOT NULL
    CONSTRAINT products_general_info_nonempty CHECK (length(btrim(general_info)) > 0),

  type TEXT NOT NULL
    CONSTRAINT products_type_nonempty CHECK (length(btrim(type)) > 0),

  new_product BOOLEAN NOT NULL,
  popular_product BOOLEAN NOT NULL,

  price NUMERIC(10, 2) NOT NULL
    CONSTRAINT products_price_nonnegative CHECK (price >= 0),

  in_stock INTEGER NOT NULL
    CONSTRAINT products_in_stock_nonnegative CHECK (in_stock >= 0),

  images JSONB NOT NULL,
  features JSONB NOT NULL,
  in_box JSONB NOT NULL
);

COMMIT;