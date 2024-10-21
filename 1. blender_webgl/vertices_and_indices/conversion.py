def convert_vertex_format(line):
    # Split the vertex data into components
    components = line.strip().split()

    # Ensure this is a vertex line (starts with 'v')
    if components[0] == 'v':
        x, y, z = float(components[1]), float(components[2]), float(components[3])

        # Convert the format
        webgl_x = round(x / 10, 7)  # Divide by 10 and round to 7 decimal places
        webgl_y = round(z / 10, 7)  # Divide by 10 and round to 7 decimal places
        webgl_z = round(-y / 10, 7) # Swap y with z and divide by 10

        # Return the formatted string
        return f"{webgl_x}, {webgl_y}, {webgl_z},"
    
    return None

def convert_vertices_file(input_file, output_file):
    with open(input_file, 'r') as infile, open(output_file, 'w') as outfile:
        for line in infile:
            converted_line = convert_vertex_format(line)
            if converted_line:
                outfile.write(converted_line + '\n')

def convert_lines_file(input_file, output_file):
    with open(input_file, 'r') as infile, open(output_file, 'w') as outfile:
        previous_line = None
        for line in infile:
            converted_line = convert_vertex_format(line)
            if converted_line:
                # If there is a previous line, print both lines
                if previous_line:
                    outfile.write(f"{previous_line.strip()}\n{converted_line.strip()}\n\n")
                previous_line = converted_line

        # Handle the last line if needed
        if previous_line:
            outfile.write(f"{previous_line.strip()}")  # Avoid extra newline at end

def convert_indices_format(line):
    components = line.strip().split()

    if components[0] == 'f':
        first, second, third, fourth = components[1], components[2], components[3], components[4]

        webgl_first = int(first.split('/')[0]) - 1
        webgl_second = int(second.split('/')[0]) - 1
        webgl_third = int(third.split('/')[0]) - 1
        webgl_fourth = int(fourth.split('/')[0]) - 1

    # Return formatted string
    return f"{webgl_first}, {webgl_second}, {webgl_third}, {webgl_first}, {webgl_third}, {webgl_fourth},"

def convert_indices_file(input_file, output_file):
    with open(input_file, 'r') as infile, open(output_file, 'w') as outfile:
        for line in infile:
            converted_line = convert_indices_format(line)
            if converted_line:
                outfile.write(converted_line + '\n')

# Specify your input and output file paths
input_file = 'vertices.txt'
output_vertices_file = 'webgl_vertices.txt'
output_lines_file = 'webgl_lines.txt'

# Call the function to convert the vertices
convert_vertices_file(input_file, output_vertices_file)
convert_lines_file(input_file, output_lines_file)

inp = 'indices.txt'
out = 'webgl_indices.txt'
convert_indices_file(inp, out)