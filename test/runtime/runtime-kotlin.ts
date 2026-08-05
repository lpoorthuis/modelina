import {
  KOTLIN_DEFAULT_PRESET,
  KOTLIN_JACKSON_PRESET,
  KotlinFileGenerator
} from '../../';
import path from 'path';
import input from './generic-input.json';
import jacksonInput from './runtime-kotlin-jackson-input.json';

const generator = new KotlinFileGenerator({
  presets: [KOTLIN_DEFAULT_PRESET]
});

generator.generateToFiles(
  input,
  path.resolve(
    // eslint-disable-next-line no-undef
    __dirname,
    './runtime-kotlin/src/main/kotlin/com/mycompany/app/generic'
  ),
  { packageName: 'com.mycompany.app.generic' }
);

const jacksonGenerator = new KotlinFileGenerator({
  presets: [KOTLIN_JACKSON_PRESET]
});

jacksonGenerator.generateToFiles(
  jacksonInput,
  path.resolve(
    // eslint-disable-next-line no-undef
    __dirname,
    './runtime-kotlin/src/main/kotlin/com/mycompany/app/jackson'
  ),
  { packageName: 'com.mycompany.app.jackson' }
);
