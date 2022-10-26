import external from 'rollup-plugin-peer-deps-external';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import dotenv from 'dotenv';
import injectProcessEnv from 'rollup-plugin-inject-process-env';

dotenv.config();

// import { terser } from 'rollup-plugin-terser';

const packageJson = require('./package.json');

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
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
        tsconfig: './tsconfig.json'
      }),
      injectProcessEnv({
        ETHERSPOT_PROJECT_KEY: process.env.ETHERSPOT_PROJECT_KEY,
      },{
        exclude: ['node_modules/**/*'],
      }),
      // terser(),
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
