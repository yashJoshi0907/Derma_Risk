import os
import zipfile
import shutil
import gdown

# This is the Google Drive Folder URL provided
FOLDER_URL = "https://drive.google.com/drive/folders/1GRwFFCjwPhs3DwTCKaE9vHyqU2ko8yxc?usp=drive_link"
MODELS_DIR = "models"

def extract_and_flatten(zip_path, extract_to):
    """
    Extracts a zip file and moves all contents up to the target directory.
    This prevents nested folders like 'models/models/cnn_model.h5'.
    """
    temp_extract_dir = os.path.join(extract_to, "_temp_extract")
    os.makedirs(temp_extract_dir, exist_ok=True)
    
    print(f"Extracting {zip_path}...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(temp_extract_dir)
        
    print("Moving extracted files to 'models' directory...")
    # Walk through the extracted files and move them to MODELS_DIR
    for root, _, files in os.walk(temp_extract_dir):
        for file in files:
            source_file = os.path.join(root, file)
            target_file = os.path.join(extract_to, file)
            
            # Move only if target doesn't exist to avoid overwrite conflicts
            if not os.path.exists(target_file):
                shutil.move(source_file, target_file)
            else:
                print(f"File {file} already exists. Skipping.")
                
    # Clean up the temporary extraction folder
    shutil.rmtree(temp_extract_dir)
    print("Cleanup completed.")

def main():
    if not os.path.exists(MODELS_DIR):
        os.makedirs(MODELS_DIR)
        print(f"Created directory: {MODELS_DIR}")
        
    print(f"Downloading from Google Drive folder: {FOLDER_URL}")
    print("This may take a few minutes depending on the file sizes...")
    
    # Download the contents of the Google Drive folder.
    # We specify 'remaining_ok=True' just in case.
    gdown.download_folder(FOLDER_URL, output=MODELS_DIR, quiet=False)
    
    print("Download finished. Checking for zip files...")
    
    # Check if there is any zip file downloaded inside MODELS_DIR
    found_zip = False
    
    # We use os.walk to find any zip file in case gdown created a subfolder
    for root, _, files in os.walk(MODELS_DIR):
        for filename in files:
            if filename.endswith(".zip"):
                found_zip = True
                zip_path = os.path.join(root, filename)
                extract_and_flatten(zip_path, MODELS_DIR)
                
                # Optionally remove the zip file to save space
                try:
                    os.remove(zip_path)
                    print(f"Removed zip file: {filename}")
                except Exception as e:
                    print(f"Could not remove zip file {filename}: {e}")

    if not found_zip:
        print("No zip file found. Models were downloaded directly or the folder was empty.")
    else:
        print("All models have been extracted and placed in the 'models/' folder.")

if __name__ == "__main__":
    main()
