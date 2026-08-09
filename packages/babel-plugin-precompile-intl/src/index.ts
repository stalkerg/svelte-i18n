import { declare } from '@babel/helper-plugin-utils';
import type {
  Expression,
  Identifier,
  ObjectExpression,
  StringLiteral,
  TemplateElement,
} from '@babel/types';
import { isIdentifier, isObjectExpression, isObjectProperty, isStringLiteral } from '@babel/types';
import type {
  DateElement,
  ExtendedNumberFormatOptions,
  MessageFormatElement,
  NumberElement,
  PluralElement,
  SelectElement,
  TimeElement,
  TYPE,
} from '@formatjs/icu-messageformat-parser';
import {
  isArgumentElement,
  isDateElement,
  isDateTimeSkeleton,
  isLiteralElement,
  isNumberElement,
  isNumberSkeleton,
  isPluralElement,
  isPoundElement,
  isSelectElement,
  isTagElement,
  isTimeElement,
  parse,
} from '@formatjs/icu-messageformat-parser';

type HelperFunction =
  '__date' | '__interpolate' | '__number' | '__offsetPlural' | '__plural' | '__select' | '__time';

type PluralType = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
type PluralAbbreviation = 'z' | 'o' | 't' | 'f' | 'm' | 'h';
type PropertyTuple = [Identifier | StringLiteral, unknown];

const CONTEXT_IDENTIFIER = '__ctx';
const VALUES_IDENTIFIER = '__values';

const HELPERS: Record<TYPE, HelperFunction> = {
  0: '__interpolate',
  1: '__interpolate',
  2: '__number',
  3: '__date',
  4: '__time',
  5: '__select',
  6: '__plural',
  7: '__interpolate',
  8: '__interpolate',
};

const PLURAL_ABBREVIATIONS: Record<PluralType, PluralAbbreviation> = {
  zero: 'z',
  one: 'o',
  two: 't',
  few: 'f',
  many: 'm',
  other: 'h',
};

/** Build the Babel plugin. The runtime path is configurable for umbrella packages. */
export default function build(runtimeImportPath = '@stalkerg/precompile-intl-runtime') {
  return declare(({ types: t, assertVersion }) => {
    assertVersion('^8.0.0');

    let usedHelpers = new Set<HelperFunction>();
    let usesValues = false;
    let pluralsStack: PluralElement[] = [];

    const context = () => t.identifier(CONTEXT_IDENTIFIER);
    const value = (name: string) => {
      usesValues = true;
      return t.memberExpression(t.identifier(VALUES_IDENTIFIER), t.stringLiteral(name), true);
    };

    function normalizePluralKey(key: string): number | string {
      const trimmed = key.trim();
      const exact = /^=(-?\d+(?:\.\d+)?)$/.exec(trimmed);
      if (exact?.[1] !== undefined) return Number(exact[1]);
      return PLURAL_ABBREVIATIONS[trimmed as PluralType] ?? trimmed;
    }

    function normalizeSelectKey(key: string): number | string {
      const trimmed = key.trim();
      const exact = /^=(-?\d+(?:\.\d+)?)$/.exec(trimmed);
      return exact?.[1] === undefined ? trimmed : Number(exact[1]);
    }

    function propertyKey(key: number | string) {
      if (typeof key === 'number') return t.numericLiteral(key);
      return t.isValidIdentifier(key) && key !== '__proto__'
        ? t.identifier(key)
        : t.stringLiteral(key);
    }

    function buildCallExpression(entry: MessageFormatElement): Expression {
      if (isLiteralElement(entry)) {
        throw new Error('Literal elements are emitted directly.');
      }
      if (isTagElement(entry)) {
        throw new Error('Tag elements are not supported.');
      }
      if (isPoundElement(entry)) {
        throw new Error('Pound elements are only valid inside a plural.');
      }
      if (isNumberElement(entry)) return buildNumberCallExpression(entry);
      if (isDateElement(entry) || isTimeElement(entry)) {
        return buildDateOrTimeCallExpression(entry);
      }
      if (isArgumentElement(entry)) {
        usedHelpers.add('__interpolate');
        return t.callExpression(t.identifier('__interpolate'), [value(entry.value)]);
      }
      if (isSelectElement(entry)) return buildSelectCallExpression(entry);
      if (isPluralElement(entry)) return buildPluralCallExpression(entry);
      throw new Error(`Unsupported ICU element type: ${(entry as { type: number }).type}`);
    }

    function buildNumberCallExpression(entry: NumberElement): Expression {
      usedHelpers.add('__number');
      const callArgs: Expression[] = [context()];
      const messageValue = value(entry.value);

      if (isNumberSkeleton(entry.style)) {
        const { scale, ...parsedOptions } = entry.style.parsedOptions;
        callArgs.push(
          scale === undefined
            ? messageValue
            : t.binaryExpression('/', messageValue, t.numericLiteral(scale)),
        );

        const keys = Object.keys(parsedOptions) as (keyof typeof parsedOptions)[];
        if (keys.length > 0) {
          callArgs.push(
            t.objectExpression(
              keys.map((key) => {
                const optionValue = parsedOptions[key];
                if (typeof optionValue === 'number') {
                  return t.objectProperty(t.identifier(key), t.numericLiteral(optionValue));
                }
                if (typeof optionValue === 'boolean') {
                  return t.objectProperty(t.identifier(key), t.booleanLiteral(optionValue));
                }
                return t.objectProperty(t.identifier(key), t.stringLiteral(String(optionValue)));
              }),
            ),
          );
        }
      } else {
        callArgs.push(messageValue);
        if (typeof entry.style === 'string') callArgs.push(t.stringLiteral(entry.style));
      }

      return t.callExpression(t.identifier('__number'), callArgs);
    }

    function buildDateOrTimeCallExpression(entry: DateElement | TimeElement): Expression {
      const helper = HELPERS[entry.type];
      usedHelpers.add(helper);
      const callArgs: Expression[] = [context(), value(entry.value)];
      if (isDateTimeSkeleton(entry.style)) {
        throw new Error('Date/time skeletons are not supported yet.');
      }
      if (typeof entry.style === 'string') callArgs.push(t.stringLiteral(entry.style));
      return t.callExpression(t.identifier(helper), callArgs);
    }

    function buildOptions(
      options: PluralElement['options'] | SelectElement['options'],
      normalizeKey: (key: string) => number | string,
    ): ObjectExpression {
      return t.objectExpression(
        Object.entries(options).map(([key, option]) => {
          const optionAst = option.value;
          const optionValue =
            optionAst.length === 1 && optionAst[0] && isLiteralElement(optionAst[0])
              ? t.stringLiteral(optionAst[0].value)
              : optionAst.length === 1 && optionAst[0]
                ? buildCallExpression(optionAst[0])
                : buildTemplateLiteral(optionAst);
          return t.objectProperty(propertyKey(normalizeKey(key)), optionValue);
        }),
      );
    }

    function buildPluralCallExpression(entry: PluralElement): Expression {
      const helper = entry.offset === 0 ? '__plural' : '__offsetPlural';
      usedHelpers.add(helper);
      pluralsStack.push(entry);
      const options = buildOptions(entry.options, normalizePluralKey);
      pluralsStack.pop();

      const callArgs: Expression[] = [context(), value(entry.value)];
      if (entry.offset !== 0) callArgs.push(t.numericLiteral(entry.offset));
      callArgs.push(options);
      if (entry.pluralType === 'ordinal') callArgs.push(t.stringLiteral('ordinal'));
      return t.callExpression(t.identifier(helper), callArgs);
    }

    function buildSelectCallExpression(entry: SelectElement): Expression {
      usedHelpers.add('__select');
      return t.callExpression(t.identifier('__select'), [
        value(entry.value),
        buildOptions(entry.options, normalizeSelectKey),
      ]);
    }

    function buildTemplateLiteral(ast: MessageFormatElement[]): Expression {
      const quasis: TemplateElement[] = [];
      const expressions: Expression[] = [];

      for (let index = 0; index < ast.length; index += 1) {
        const entry = ast[index];
        if (!entry) continue;

        if (isLiteralElement(entry)) {
          quasis.push(
            t.templateElement({ cooked: entry.value, raw: entry.value }, index === ast.length - 1),
          );
          continue;
        }

        if (isPoundElement(entry)) {
          const plural = pluralsStack.at(-1);
          if (!plural) throw new Error('A pound element must be nested in a plural.');
          const pluralValue = value(plural.value);
          expressions.push(
            plural.offset === 0
              ? pluralValue
              : t.binaryExpression('-', pluralValue, t.numericLiteral(plural.offset)),
          );
        } else {
          expressions.push(buildCallExpression(entry));
        }

        if (index === 0) quasis.push(t.templateElement({ cooked: '', raw: '' }, false));
        if (index === ast.length - 1) {
          quasis.push(t.templateElement({ cooked: '', raw: '' }, true));
        }
      }

      if (quasis.length === 0 && expressions.length === 0) return t.stringLiteral('');
      while (quasis.length <= expressions.length) {
        quasis.unshift(t.templateElement({ cooked: '', raw: '' }, false));
      }
      return t.templateLiteral(quasis, expressions);
    }

    function buildFunction(ast: MessageFormatElement[]): Expression {
      usesValues = false;
      pluralsStack = [];
      const first = ast[0];
      const body =
        ast.length === 1 && first ? buildCallExpression(first) : buildTemplateLiteral(ast);
      if (!usesValues) return body;
      return t.arrowFunctionExpression(
        [t.identifier(CONTEXT_IDENTIFIER), t.identifier(VALUES_IDENTIFIER)],
        body,
      );
    }

    function compileMessage(message: string): Expression | undefined {
      const ast = parse(message, { ignoreTag: true });
      if (ast.length === 1 && ast[0] && isLiteralElement(ast[0])) return undefined;
      return buildFunction(ast);
    }

    function flattenObjectProperties(
      object: ObjectExpression,
      properties: PropertyTuple[],
      currentPrefix?: string,
    ): void {
      for (const property of object.properties) {
        if (!isObjectProperty(property)) {
          throw new Error('Exported objects can only contain regular properties.');
        }
        if (!isStringLiteral(property.key) && !isIdentifier(property.key)) {
          throw new Error('Translation keys must be strings or identifiers.');
        }
        const ownName = isStringLiteral(property.key) ? property.key.value : property.key.name;
        const name = currentPrefix ? `${currentPrefix}.${ownName}` : ownName;
        if (isObjectExpression(property.value)) {
          flattenObjectProperties(property.value, properties, name);
        } else {
          properties.push([
            isStringLiteral(property.key) || currentPrefix
              ? t.stringLiteral(name)
              : t.identifier(name),
            property.value,
          ]);
        }
      }
    }

    return {
      name: 'precompile-intl',
      visitor: {
        Program: {
          enter() {
            usedHelpers = new Set();
          },
          exit(path) {
            if (usedHelpers.size === 0) return;
            path.unshiftContainer(
              'body',
              t.importDeclaration(
                [...usedHelpers]
                  .sort()
                  .map((name) => t.importSpecifier(t.identifier(name), t.identifier(name))),
                t.stringLiteral(runtimeImportPath),
              ),
            );
          },
        },
        ObjectProperty({ node }) {
          if (t.isStringLiteral(node.value)) {
            node.value = compileMessage(node.value.value) ?? node.value;
          } else if (t.isTemplateLiteral(node.value) && node.value.quasis.length === 1) {
            const raw = node.value.quasis[0]?.value.raw;
            if (raw !== undefined) node.value = compileMessage(raw) ?? node.value;
          }
        },
        VariableDeclarator({ node }) {
          if (t.isStringLiteral(node.init)) {
            node.init = compileMessage(node.init.value) ?? node.init;
          }
        },
        ExportDefaultDeclaration({ node }) {
          if (!isObjectExpression(node.declaration)) {
            throw new Error('The default export must be an object.');
          }
          const properties: PropertyTuple[] = [];
          flattenObjectProperties(node.declaration, properties);
          node.declaration = t.objectExpression(
            properties.map(([key, value]) =>
              t.objectProperty(key, value as Parameters<typeof t.objectProperty>[1]),
            ),
          );
        },
      },
    };
  });
}
