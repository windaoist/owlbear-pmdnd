<script setup lang="ts">
import CharacterImport from './CharacterImport.vue'
import SaveLoadControls from './SaveLoadControls.vue'
</script>

<template>
  <div class="files-tab">
    <section class="file-panel">
      <h2>文件操作</h2>
      <div class="file-actions">
        <CharacterImport variant="panel" label="导入角色卡 (.xlsx)" />
        <SaveLoadControls variant="panel" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.files-tab {
  height: 100%;
  overflow: auto;
  background: #fff;
  padding: 12px;
}

.file-panel {
  max-width: 560px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 14px;
  background: #fafafa;
}

h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.file-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-start;
}

@media (max-width: 620px) {
  .files-tab {
    padding: 8px;
  }

  .file-panel {
    max-width: none;
    padding: 10px;
  }

  .file-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
