import RCO3Installer, { InstallAction } from "./Installer";
import { VersionCheck, NodeInstaller, PathHelper } from "@rco3/nodeinstallutil";
import fs from 'fs-extra';
import path from 'path';
import proc from 'process';

if (!fs.existsSync(path.join(__dirname, '../package.json'))) throw new Error('Cannot find package.json!')
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'))

export const installer = new RCO3Installer();

if (proc.argv.includes('-v') || proc.argv.includes('--version')) {
  console.log(`RCO3Installer v${pkg.version ?? 'unknown'}
Dependencies:
${Object.keys(pkg.dependencies).map(v => ` ${v}: ${pkg.dependencies[v]}`).join('\n')}
Node:
${Object.keys(proc.versions).map(v => ` ${v}: ${proc.versions[v]}`).join('\n')}`);
  proc.exit(0)
}

(async () => {
  installer.ensureDir()
  installer.printTitleCredits()
  installer.printMainMenu()
  installer.printFossNotice()
  const Action = await installer.getMainMenuInput() // will repeat until valid input or ctrl+c
  switch (Action) {
    case InstallAction.Quit:
      proc.exit(0)
    case InstallAction.Install: {
      const sysver = NodeInstaller.checkSystemVer()
      if (sysver === VersionCheck.Outdated) {
        installer.printInstallationStep(`NodeJS is Outdated!
Please either remove your system's NodeJS installation, or upgrade it to at least ${proc.versions.node}`, 'Error');
        return;
      } else if (sysver === VersionCheck.NotInstalled) {
        installer.printInstallationStep(`Attempting to install NodeJS`)
        await NodeInstaller.install()
        const phpr = new PathHelper()
        const node = phpr.search('node', proc.platform === 'win32')
        if (!node)
          throw new Error('Failed to install NodeJS! Please install it manually.')
        installer.printInstallationStep(`Successfully installed NodeJS @ ${node}`)
        await new Promise(r => setTimeout(r, 1000))
      }
      installer.printInstallationStep('Ensuring RCO3 Directory Exists');
      installer.ensureDir()
      installer.printInstallationStep('Downloading RCO3');
      // await installer.downloadRCO3() // todo
      if (proc.platform === 'win32') {
        installer.printInstallationStep('Adding RCO3 to Registry');
        await installer.addToStartupRegistry()
      }
      installer.printTitleCredits()
      installer.printLaunchMenu()
      installer.printFossNotice()
      let shouldQuit = false;
      while (!shouldQuit) {
        const LaunchAction = await installer.TTYText.readkey()
        switch (LaunchAction) {
          case 'l':
            installer.printInstallationStep('Launching RCO3', 'Launching');
            // await installer.launchRCO3() // todo
            shouldQuit = true;
            break;
          case 'q':
            shouldQuit = true;
            break;
        }
      }
      break;
    }
    case InstallAction.Uninstall: {
      installer.printInstallationStep('Removing RCO3 Directory', false);
      installer.ensureDirRemoved()
      installer.printInstallationStep('Removing RCO3 from Registry', false);
      await installer.removeFromStartupRegistry()
      installer.printInstallationStep('Done!', false);
      break;
    }
  }
})()
