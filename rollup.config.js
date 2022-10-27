import external from 'rollup-plugin-peer-deps-external';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import dotenv from 'dotenv';

dotenv.config();


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
      replace({
        __ETHERSPOT_PROJECT_KEY__: process.env.ETHERSPOT_PROJECT_KEY ?? '',
        preventAssignment: true,
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
