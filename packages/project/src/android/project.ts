import { join } from 'path';
import gradleToJs from 'gradle-to-js/lib/parser.js'
import { pathExists, mkdir, readFile, writeFile } from '@ionic/utils-fs';


import { CapacitorProject } from "../project";
import { AndroidManifest } from './manifest';

import { AndroidResDir } from '../definitions';
import { GradleFile } from './gradle-file';

export class AndroidProject {
  private manifest: AndroidManifest;
  private buildGradle: GradleFile | null = null;
  private appBuildGradle: GradleFile | null = null;

  constructor(private project: CapacitorProject) {
    const manifestPath = this.getAndroidManifestPath();
    if (!manifestPath) {
      throw new Error('Unable to load AndroidManifest.xml for project');
    }
    this.manifest = new AndroidManifest(manifestPath);
  }

  async load() {
    await this.manifest.load();
    this.buildGradle = await this.loadGradle('build.gradle');
    this.appBuildGradle = await this.loadGradle('app/build.gradle');
  }

  getAndroidManifest() {
    return this.manifest;
  }

  getGradleFile(path: string) {
    if (path === 'build.gradle') {
      return this.buildGradle;
    } else if (path === 'app/build.gradle') {
      return this.appBuildGradle;
    }
    return null;
  }

  async setPackageName(packageName: string) {
    this.manifest.getDocumentElement()?.setAttribute('package', packageName);
  }

  getPackageName() {
    return this.manifest.getDocumentElement()?.getAttribute('package');
  }

  setVersionCode(versionCode: number) {
    return this.appBuildGradle?.setVersionCode(versionCode);
  }

  async getVersionCode(): Promise<number | null> {
    return (await this.appBuildGradle?.getVersionCode()) ?? null;
  }

  incrementVersionCode(): Promise<void> {
    return this.appBuildGradle?.incrementVersionCode() ?? Promise.resolve();
  }

  setVersionName(versionName: string) {
    return this.appBuildGradle?.setVersionName(versionName);
  }

  getVersionName(): Promise<string | null> {
    return this.appBuildGradle?.getVersionName() ?? Promise.resolve(null);
  }

  /**
   * Add a new file to the given resources directory with the given contents and
   * given file name
   **/
  getResource(resDir: AndroidResDir, file: string, options: { encoding: 'utf-8' | string } | null = { encoding: 'utf-8' }) {
    const root = this.getResourcesRoot();
    if (!root) {
      return;
    }

    const dir = join(root, resDir);

    if (!options) {
      return readFile(join(dir, file));
    }

    return readFile(join(dir, file), options);
  }
  /**
   * Add a new file to the given resources directory with the given contents and
   * given file name
   **/
  async addResource(resDir: AndroidResDir, file: string, contents: string) {
    const root = this.getResourcesRoot();
    if (!root) {
      return;
    }

    const dir = join(root, resDir);

    if (!(await pathExists(dir))) {
      await mkdir(dir);
    }

    return writeFile(join(dir, file), contents);
  }

  /**
   * Copy the given source into the given resources directory with the
   * given file name
   **/
  async copyToResources(resDir: AndroidResDir, file: string, source: string) {
    const root = this.getResourcesRoot();
    if (!root) {
      return;
    }

    const dir = join(root, resDir);

    if (!(await pathExists(dir))) {
      await mkdir(dir);
    }

    const sourceData = await readFile(source);
    return writeFile(join(dir, file), sourceData);
  }

  async injectGradle(path: string, _gradleObject: any) {
    if (!this.project.config.android?.path) {
      return;
    }
    const filename = join(this.project.config.android?.path, path);
    const parsed = await gradleToJs.parseFile(filename);
    console.log(`----GRADLE-----`);
    console.log(JSON.stringify(parsed, null, 2));
    console.log(`----------------------`);
  }

  private getAndroidManifestPath(): string | null {
    if (!this.project.config.android?.path) {
      return null;
    }
    return join(this.project.config.android?.path, 'app', 'src', 'main', 'AndroidManifest.xml');
  }

  private getResourcesRoot(): string | null {
    if (!this.project.config.android?.path) {
      return null;
    }
    return join(this.project.config.android?.path, 'app', 'src', 'main', 'res');
  }

  private async loadGradle(path: string): Promise<GradleFile | null> {
    if (!this.project.config.android?.path) {
      return null;
    }
    const filename = join(this.project.config.android?.path, path);

    return new GradleFile(filename, this.project.vfs);
  }
}