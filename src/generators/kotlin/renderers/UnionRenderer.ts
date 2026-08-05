import { FormatHelpers } from '../../../helpers';
import { ConstrainedUnionModel } from '../../../models';
import { KotlinOptions } from '../KotlinGenerator';
import { UnionPresetType } from '../KotlinPreset';
import { KotlinRenderer } from '../KotlinRenderer';

/** Renderer for Kotlin sealed interfaces that represent object unions. */
export class UnionRenderer extends KotlinRenderer<ConstrainedUnionModel> {
  async defaultSelf(): Promise<string> {
    const content: string[] = [];
    const discriminator = this.model.options.discriminator;
    if (discriminator?.type) {
      const propertyName = FormatHelpers.toCamelCase(
        FormatHelpers.replaceSpecialCharacters(discriminator.discriminator, {
          exclude: ['_'],
          separator: '_'
        })
      );
      content.push(`val ${propertyName}: ${discriminator.type}`);
    }
    content.push(await this.runAdditionalContentPreset());

    const body = this.renderBlock(content);
    if (!body) {
      return `sealed interface ${this.model.name}`;
    }
    return `sealed interface ${this.model.name} {
${this.indent(body)}
}`;
  }
}

export const KOTLIN_DEFAULT_UNION_PRESET: UnionPresetType<KotlinOptions> = {
  self({ renderer }) {
    return renderer.defaultSelf();
  }
};
