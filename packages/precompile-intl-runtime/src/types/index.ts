export interface Formats {
  readonly number: Readonly<Record<string, Intl.NumberFormatOptions>>;
  readonly date: Readonly<Record<string, Intl.DateTimeFormatOptions>>;
  readonly time: Readonly<Record<string, Intl.DateTimeFormatOptions>>;
}

export type PartialFormats = {
  readonly [Type in keyof Formats]?: Formats[Type];
};

export interface MessageContext {
  readonly locale: string;
  readonly formats: Formats;
}

export type MessageValues = Readonly<Record<string, unknown>>;
export type MessageFunction = (context: MessageContext, values: MessageValues) => string;
export type Message = string | MessageFunction;

export interface Catalog {
  readonly [key: string]: Message | Catalog;
}

export type Catalogs = Readonly<Record<string, Catalog>>;
export type LoadedCatalog = Catalog | { readonly default: Catalog };
export type MessagesLoader = () => Promise<LoadedCatalog>;
export type LocaleLoaders = Readonly<Record<string, MessagesLoader | readonly MessagesLoader[]>>;

export interface I18nOptions {
  readonly locale: string;
  readonly fallbackLocale?: string;
  readonly messages?: Catalogs;
  readonly loaders?: LocaleLoaders;
  readonly formats?: PartialFormats;
  readonly loadingDelay?: number;
  readonly warnOnMissingMessages?: boolean;
}

export interface TranslateOptions {
  readonly locale?: string;
  readonly default?: string;
}

export type NumberFormatOptions = Intl.NumberFormatOptions & {
  readonly format?: string;
  readonly locale?: string;
};

export type DateTimeFormatOptions = Intl.DateTimeFormatOptions & {
  readonly format?: string;
  readonly locale?: string;
};

export interface GetClientLocaleOptions {
  readonly navigator?: boolean;
  readonly hash?: string;
  readonly search?: string;
  readonly pathname?: RegExp;
  readonly hostname?: RegExp;
}
