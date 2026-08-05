import {
  ConstrainedDictionaryModel,
  ConstrainedMetaModel,
  ConstrainedObjectModel,
  ConstrainedReferenceModel,
  ConstrainedUnionModel
} from '../../../models';
import { shouldRenderInterface } from '../renderers/ClassRenderer';
import { KotlinRenderer } from '../KotlinRenderer';
import { KotlinPreset } from '../KotlinPreset';

const JACKSON_ANNOTATION_DEPENDENCY = 'com.fasterxml.jackson.annotation.*';

/**
 * Preset which adds Jackson annotations for JSON serialization and deserialization.
 */
export const KOTLIN_JACKSON_PRESET: KotlinPreset = {
  class: {
    self({ renderer, model, content }) {
      renderer.dependencyManager.addDependency(JACKSON_ANNOTATION_DEPENDENCY);
      const discriminator = discriminatorName(model);
      if (
        shouldRenderInterface(model) &&
        discriminator &&
        model.options.implementedBy?.length
      ) {
        return renderer.renderBlock([
          renderTypeInfo(renderer, discriminator),
          renderSubTypes(
            renderer,
            model.options.implementedBy,
            discriminator,
            discriminatorMapping(model)
          ),
          content
        ]);
      }

      const typeName = concreteDiscriminatorName(model);
      if (typeName) {
        return renderer.renderBlock([
          renderer.renderAnnotation('JsonTypeName', `"${typeName}"`),
          content
        ]);
      }
      return content;
    },
    property({ renderer, model, property, content }) {
      const discriminator = inheritedDiscriminatorName(model);
      const usesGeneratedTypeId = Boolean(
        concreteDiscriminatorName(model) ||
          (shouldRenderInterface(model) && model.options.implementedBy?.length)
      );
      if (
        usesGeneratedTypeId &&
        property.unconstrainedPropertyName === discriminator
      ) {
        return renderer.renderBlock([
          renderer.renderAnnotation(
            'JsonProperty',
            {
              value: `"${property.unconstrainedPropertyName}"`,
              access: 'JsonProperty.Access.WRITE_ONLY'
            },
            'get:'
          ),
          content
        ]);
      }
      const isUnwrappedDictionary =
        property.property instanceof ConstrainedDictionaryModel &&
        property.property.serializationType === 'unwrap';
      if (isUnwrappedDictionary) {
        if (shouldRenderInterface(model)) {
          return renderer.renderBlock([
            renderer.renderAnnotation('JsonAnyGetter', undefined, 'get:'),
            content
          ]);
        }
        const mutableMapType = property.property.type.replace(
          /^Map</,
          'MutableMap<'
        );
        const nullableMapType = `${property.property.type}?`;
        const renderedMapType = content.includes(nullableMapType)
          ? nullableMapType
          : property.property.type;
        const mutableContent = content
          .replace(renderedMapType, mutableMapType)
          .replace(' = null', ' = mutableMapOf()');
        return renderer.renderBlock([
          renderer.renderAnnotation('JsonAnyGetter', undefined, 'get:'),
          renderer.renderAnnotation('JsonAnySetter', undefined, 'field:'),
          mutableContent
        ]);
      }

      const annotations = [
        renderer.renderAnnotation(
          'JsonProperty',
          `"${property.unconstrainedPropertyName}"`,
          'get:'
        )
      ];
      if (!property.required) {
        annotations.push(
          renderer.renderAnnotation(
            'JsonInclude',
            'JsonInclude.Include.NON_NULL',
            'get:'
          )
        );
      }
      return renderer.renderBlock([...annotations, content]);
    }
  },
  enum: {
    self({ renderer, content }) {
      renderer.dependencyManager.addDependency(JACKSON_ANNOTATION_DEPENDENCY);
      return content;
    },
    item({ content, model, item }) {
      const defaultEnumValue = model.originalInput?.default;
      return item.originalInput === defaultEnumValue
        ? `@JsonEnumDefaultValue ${content}`
        : content;
    },
    value({ content }) {
      return `@get:JsonValue ${content}`;
    },
    fromValue({ model }) {
      return `companion object {
    @JvmStatic
    @JsonCreator
    fun forValue(value: ${model.type}): ${model.name} {
        return values().firstOrNull { it.value == value }
            ?: throw IllegalArgumentException("Unexpected value '$value'")
    }
}`;
    }
  },
  union: {
    self({ renderer, model, content }) {
      renderer.dependencyManager.addDependency(JACKSON_ANNOTATION_DEPENDENCY);
      if (!model.options.discriminator) {
        return content;
      }
      return renderer.renderBlock([
        renderTypeInfo(renderer, model.options.discriminator.discriminator),
        renderSubTypes(
          renderer,
          model.union,
          model.options.discriminator.discriminator
        ),
        content
      ]);
    }
  }
};

function renderTypeInfo<ModelType extends ConstrainedMetaModel>(
  renderer: KotlinRenderer<ModelType>,
  discriminator: string
): string {
  return renderer.renderAnnotation('JsonTypeInfo', {
    use: 'JsonTypeInfo.Id.NAME',
    include: 'JsonTypeInfo.As.PROPERTY',
    property: `"${discriminator}"`,
    visible: 'true'
  });
}

function renderSubTypes<ModelType extends ConstrainedMetaModel>(
  renderer: KotlinRenderer<ModelType>,
  subTypes: ConstrainedMetaModel[],
  discriminator: string,
  mapping: Map<string, string> = new Map()
): string {
  const renderedTypes = subTypes
    .map((subType) => {
      const model =
        subType instanceof ConstrainedReferenceModel ? subType.ref : subType;
      if (!(model instanceof ConstrainedObjectModel)) {
        return undefined;
      }
      const discriminatorValue =
        mapping.get(model.name) ||
        discriminatorConst(model, discriminator) ||
        model.name;
      return `JsonSubTypes.Type(value = ${model.name}::class, name = "${discriminatorValue}")`;
    })
    .filter(Boolean)
    .join(',\n');
  return renderer.renderAnnotation('JsonSubTypes', `\n${renderedTypes}\n`);
}

function discriminatorConst(
  model: ConstrainedObjectModel,
  discriminator: string
): string | undefined {
  const property = Object.values(model.properties).find(
    (candidate) => candidate.unconstrainedPropertyName === discriminator
  );
  const value = property?.property.options.const?.originalInput;
  return typeof value === 'string' ? value : undefined;
}

function inheritedDiscriminatorName(
  model: ConstrainedObjectModel
): string | undefined {
  const ownDiscriminator = discriminatorName(model);
  if (ownDiscriminator) {
    return ownDiscriminator;
  }
  for (const extended of model.options.extend || []) {
    const parent =
      extended instanceof ConstrainedReferenceModel ? extended.ref : extended;
    if (parent instanceof ConstrainedObjectModel) {
      const parentDiscriminator = discriminatorName(parent);
      if (parentDiscriminator) {
        return parentDiscriminator;
      }
    }
  }
  return undefined;
}

function concreteDiscriminatorName(
  model: ConstrainedObjectModel
): string | undefined {
  return extendedDiscriminatorName(model) || unionDiscriminatorName(model);
}

function extendedDiscriminatorName(
  model: ConstrainedObjectModel
): string | undefined {
  for (const extended of model.options.extend || []) {
    const parent =
      extended instanceof ConstrainedReferenceModel ? extended.ref : extended;
    if (!(parent instanceof ConstrainedObjectModel)) {
      continue;
    }
    const mapping = discriminatorMapping(parent);
    const discriminator = discriminatorName(parent);
    const typeName =
      mapping.get(model.name) ||
      (discriminator ? discriminatorConst(model, discriminator) : undefined);
    if (typeName) {
      return typeName;
    }
  }
  return undefined;
}

function unionDiscriminatorName(
  model: ConstrainedObjectModel
): string | undefined {
  for (const parent of model.options.parents || []) {
    if (
      parent instanceof ConstrainedUnionModel &&
      parent.options.discriminator
    ) {
      return (
        discriminatorConst(model, parent.options.discriminator.discriminator) ||
        model.name
      );
    }
  }
  return undefined;
}

function discriminatorName(model: ConstrainedObjectModel): string | undefined {
  const discriminator =
    model.options.discriminator?.discriminator ||
    model.originalInput?.discriminator;
  return typeof discriminator === 'string' ? discriminator : undefined;
}

function discriminatorMapping(
  model: ConstrainedObjectModel
): Map<string, string> {
  const mapping = model.originalInput?.['x-discriminator-mapping'];
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    return new Map();
  }

  const result = new Map<string, string>();
  for (const [wireValue, schemaReference] of Object.entries(mapping)) {
    if (typeof schemaReference === 'string') {
      result.set(
        schemaReference.split('/').pop() || schemaReference,
        wireValue
      );
    }
  }
  return result;
}
