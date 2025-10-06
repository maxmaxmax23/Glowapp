<Box
  display="flex"
  flexDirection="column"
  justifyContent="center"   // vertical centering
  alignItems="center"       // horizontal centering
  px={{ base: 4, md: 8 }}
  py={{ base: 4, md: 8 }}
  bg="gray.900"
  color="gold"
  w="full"
  maxW="600px"              // constrain content width
  mx="auto"                 // center horizontally
>
  {!user ? (
    <LoginForm onLogin={setUser} />
  ) : (
    <>
      <Dashboard
        onScan={() => setShowScanner(true)}
        onOpenImporter={() => setShowImporter(true)}
        onOpenMerger={() => setShowMerger(true)}
        firebaseWrites={firebaseWrites}
      />

      {showScanner && (
        <ScannerModal
          onClose={() => setShowScanner(false)}
          onSelect={handleScanSelect}
        />
      )}

      {showImporter && (
        <ImporterModal
          onClose={() => setShowImporter(false)}
          queuedData={[]} // your workflow data
        />
      )}

      {showMerger && (
        <MergerModal
          onClose={() => setShowMerger(false)}
          addToQueue={() => {}}
        />
      )}

      <ProductModal
        code={scannedCode}
        onClose={() => setScannedCode(null)}
      />
    </>
  )}
</Box>
