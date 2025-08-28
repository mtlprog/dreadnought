export default function Home() {
  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">MONTELIBERO CROWDSOURCING PLATFORM</h1>
          <p className="text-green-300">Transparent blockchain-based project funding for the Montelibero Association</p>
        </header>

        <main className="space-y-8">
          <section className="border border-green-400 p-6">
            <h2 className="text-xl font-bold mb-4">SYSTEM STATUS</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Application:</span>
                <span className="text-yellow-400">INITIALIZING</span>
              </div>
              <div className="flex justify-between">
                <span>Stellar Network:</span>
                <span className="text-green-400">CONNECTED</span>
              </div>
              <div className="flex justify-between">
                <span>IPFS Storage:</span>
                <span className="text-green-400">READY</span>
              </div>
            </div>
          </section>

          <section className="border border-green-400 p-6">
            <h2 className="text-xl font-bold mb-4">ACTIVE PROJECTS</h2>
            <p className="text-green-300 mb-4">No projects found. Use the CLI tool to create the first project.</p>
            
            <div className="bg-gray-900 p-4 text-sm">
              <p className="text-yellow-400 mb-2">CLI USAGE:</p>
              <code className="block text-green-300">
                cd apps/crowd.mtla.me<br/>
                bun run cli create-project \<br/>
                &nbsp;&nbsp;--name "Project Name" \<br/>
                &nbsp;&nbsp;--description "Project description" \<br/>
                &nbsp;&nbsp;--target 1000 \<br/>
                &nbsp;&nbsp;--deadline "2025-12-31" \<br/>
                &nbsp;&nbsp;--coordinator "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              </code>
            </div>
          </section>

          <section className="border border-green-400 p-6">
            <h2 className="text-xl font-bold mb-4">PLATFORM FEATURES</h2>
            <ul className="space-y-2 text-green-300">
              <li>• Transparent project funding using MTLCrowd tokens</li>
              <li>• Automatic fund return if project fails to reach goal</li>
              <li>• NFT-based project management on Stellar blockchain</li>
              <li>• IPFS metadata storage for decentralization</li>
              <li>• Integration with MMWB and Sunce wallets</li>
            </ul>
          </section>
        </main>

        <footer className="mt-8 pt-8 border-t border-green-400 text-center text-green-300">
          <p>Montelibero Association • Built with Next.js & Effect-TS • Powered by Stellar</p>
        </footer>
      </div>
    </div>
  );
}