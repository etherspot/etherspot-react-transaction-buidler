import external from 'rollup-plugin-peer-deps-external';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import dotenv from 'dotenv';
import autoprefixer from 'autoprefixer';
import postcss from 'rollup-plugin-postcss';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const packageJson = require('./package.json');

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: !isProduction,
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: !isProduction,
      },
    ],
    watch: {
      clearScreen: false,
      include: 'src/**',
    },
    plugins: [
      external(),
      resolve({
        browser: true,
      }),
      commonjs(),
      typescript({
        sourceMap: !isProduction,
        tsconfig: './tsconfig.json',
        exclude: ['./example/**', './src/test/**']
      }),
      replace({
        __ETHERSPOT_PROJECT_KEY__: process.env.ETHERSPOT_PROJECT_KEY ?? '',
        preventAssignment: true,
        __ETHERSPOT_BUILDER_VERSION__: packageJson.version,
        __ETHERSPOT_SDK_VERSION__: packageJson.dependencies.etherspot,
      }),
      postcss({
        plugins: [autoprefixer()],
        sourceMap: true,
        extract: true,
        minimize: true
      }),
      process.env.NODE_ENV === 'production' && terser(),
    ],
    external: ['react', 'react-dom', 'styled-components', 'etherspot'],
    context: 'window'
  },
  {
    input: 'dist/esm/types/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: ['react', 'react-dom', 'styled-components', 'etherspot'],
    watch: {
      clearScreen: false,
      include: 'src/**',
    },
  },
];
