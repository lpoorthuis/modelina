import { KotlinPreset } from '../KotlinPreset';

const JACKSON_ANNOTATION_DEPENDENCY = 'com.fasterxml.jackson.annotation.*';

/**
 * Preset which adds Jackson annotations for JSON serialization and deserialization.
 */
export const KOTLIN_JACKSON_PRESET: KotlinPreset = {
  class: {
    self({ renderer, content }) {
      renderer.dependencyManager.addDependency(JACKSON_ANNOTATION_DEPENDENCY);
      return content;
    },
    property({ renderer, property, content }) {
      return renderer.renderBlock([
        renderer.renderAnnotation(
          'JsonProperty',
          `"${property.unconstrainedPropertyName}"`,
          'get:'
        ),
        content
      ]);
    }
  },
  enum: {
    self({ renderer, content }) {
      renderer.dependencyManager.addDependency(JACKSON_ANNOTATION_DEPENDENCY);
      return content;
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
  }
};
